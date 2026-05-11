"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { ghostParticipants, groupMemberships, groups, invites, users } from "@/db/schema";
import { sendGroupInviteEmail } from "@/lib/email";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

export async function createGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = (formData.get("name") as string).trim();
  const currency = (formData.get("currency") as string) || "EUR";
  if (!name) throw new Error("Group name is required");

  const [group] = await db
    .insert(groups)
    .values({ name, currency, createdById: session.user.id })
    .returning();

  await db.insert(groupMemberships).values({
    groupId: group.id,
    userId: session.user.id,
    role: "admin",
  });

  await db.insert(invites).values({
    groupId: group.id,
    token: nanoid(12),
  });

  redirect(`/groups/${group.id}`);
}

export async function inviteMemberByEmail(groupId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const email = (formData.get("email") as string).trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  await assertMember(groupId, session.user.id);

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  const [invite] = await db.select().from(invites).where(eq(invites.groupId, groupId));

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invite.token}`;

  await sendGroupInviteEmail({
    to: email,
    inviterName: session.user.name ?? "Someone",
    groupName: group.name,
    joinUrl,
  });

  return { ok: true };
}

export async function addGhostParticipant(groupId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() || null;
  if (!name) throw new Error("Name is required");

  await assertMember(groupId, session.user.id);

  await db.insert(ghostParticipants).values({ groupId, name, email });

  return { ok: true };
}

async function assertMember(groupId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId)
      )
    );
  if (!membership) throw new Error("Not a member of this group");
}

export async function getGroupWithMembers(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertMember(groupId, session.user.id);

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId));

  if (!group) throw new Error("Group not found");

  const memberships = await db
    .select({ user: users })
    .from(groupMemberships)
    .innerJoin(users, eq(groupMemberships.userId, users.id))
    .where(eq(groupMemberships.groupId, groupId));

  const ghosts = await db
    .select()
    .from(ghostParticipants)
    .where(eq(ghostParticipants.groupId, groupId));

  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.groupId, groupId));

  return { group, members: memberships.map((m) => m.user), ghosts, invite };
}

export async function getUserGroups() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rows = await db
    .select({ group: groups })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(eq(groupMemberships.userId, session.user.id));

  return rows.map((r) => r.group);
}
