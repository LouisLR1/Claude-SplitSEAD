"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { ghostParticipants, groupMemberships, groups, invites, payments, paymentSplits, users } from "@/db/schema";
import { sendGroupInviteEmail } from "@/lib/email";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
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

export async function addGhostParticipant(
  groupId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() || null;
  if (!name) return { ok: false, error: "Name is required" };

  await assertMember(groupId, session.user.id);

  const [existingGhosts, existingMembers] = await Promise.all([
    db.select({ name: ghostParticipants.name }).from(ghostParticipants).where(eq(ghostParticipants.groupId, groupId)),
    db.select({ name: users.name }).from(groupMemberships).innerJoin(users, eq(groupMemberships.userId, users.id)).where(eq(groupMemberships.groupId, groupId)),
  ]);

  const taken = new Set([
    ...existingGhosts.map((g) => g.name.toLowerCase()),
    ...existingMembers.map((m) => (m.name ?? "").toLowerCase()),
  ]);

  if (taken.has(name.toLowerCase())) {
    return { ok: false, error: `"${name}" is already in this group` };
  }

  await db.insert(ghostParticipants).values({ groupId, name, email });

  revalidatePath(`/groups/${groupId}`);
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

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) throw new Error("Group not found");

  const memberships = await db
    .select({ user: users, role: groupMemberships.role })
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

  const currentUserId = session.user.id;
  const currentMembership = memberships.find((m) => m.user.id === currentUserId);
  const isAdmin = currentMembership?.role === "admin";

  const memberBalances = Object.fromEntries(
    await Promise.all(
      memberships.map(async ({ user }) => [
        user.id,
        await getUserNetBalanceCents(groupId, user.id),
      ])
    )
  );

  const ghostBalances = Object.fromEntries(
    await Promise.all(
      ghosts.map(async (g) => [
        g.id,
        await getGhostNetBalanceCents(groupId, g.id),
      ])
    )
  );

  const allBalancesZero = await allGroupBalancesZero(groupId);

  return {
    group,
    memberships,
    ghosts,
    invite,
    isAdmin,
    currentUserId,
    memberBalances,
    ghostBalances,
    allBalancesZero,
  };
}

export async function joinGroupAsNew(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, session.user.id)
      )
    );

  if (!existing) {
    await db.insert(groupMemberships).values({
      groupId,
      userId: session.user.id,
      role: "member",
    });
  }

  redirect(`/groups/${groupId}`);
}

export async function joinGroupAsGhost(groupId: string, ghostId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  await db.transaction(async (tx) => {
    // Rewrite any payment splits from ghost → this user
    await tx
      .update(paymentSplits)
      .set({ userId, ghostId: null })
      .where(eq(paymentSplits.ghostId, ghostId));

    // Rewrite any payments where this ghost was the payer
    await tx
      .update(payments)
      .set({ payerUserId: userId, payerGhostId: null })
      .where(eq(payments.payerGhostId, ghostId));

    // Delete the ghost
    await tx
      .delete(ghostParticipants)
      .where(eq(ghostParticipants.id, ghostId));

    // Add as real member if not already
    const [existing] = await tx
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, userId)
        )
      );

    if (!existing) {
      await tx.insert(groupMemberships).values({ groupId, userId, role: "member" });
    }
  });

  redirect(`/groups/${groupId}`);
}

// ─── Balance helpers ──────────────────────────────────────────────────────────

async function getUserNetBalanceCents(groupId: string, userId: string): Promise<number> {
  const [paid] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amountInCents}), 0)` })
    .from(payments)
    .where(and(eq(payments.groupId, groupId), eq(payments.payerUserId, userId)));

  const [owed] = await db
    .select({ total: sql<number>`coalesce(sum(${paymentSplits.amountInCents}), 0)` })
    .from(paymentSplits)
    .innerJoin(payments, eq(paymentSplits.paymentId, payments.id))
    .where(and(eq(payments.groupId, groupId), eq(paymentSplits.userId, userId)));

  return Number(paid.total) - Number(owed.total);
}

async function getGhostNetBalanceCents(groupId: string, ghostId: string): Promise<number> {
  const [paid] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amountInCents}), 0)` })
    .from(payments)
    .where(and(eq(payments.groupId, groupId), eq(payments.payerGhostId, ghostId)));

  const [owed] = await db
    .select({ total: sql<number>`coalesce(sum(${paymentSplits.amountInCents}), 0)` })
    .from(paymentSplits)
    .innerJoin(payments, eq(paymentSplits.paymentId, payments.id))
    .where(and(eq(payments.groupId, groupId), eq(paymentSplits.ghostId, ghostId)));

  return Number(paid.total) - Number(owed.total);
}

async function allGroupBalancesZero(groupId: string): Promise<boolean> {
  const members = await db
    .select({ userId: groupMemberships.userId })
    .from(groupMemberships)
    .where(eq(groupMemberships.groupId, groupId));

  const ghosts = await db
    .select({ id: ghostParticipants.id })
    .from(ghostParticipants)
    .where(eq(ghostParticipants.groupId, groupId));

  for (const { userId } of members) {
    if ((await getUserNetBalanceCents(groupId, userId)) !== 0) return false;
  }
  for (const { id } of ghosts) {
    if ((await getGhostNetBalanceCents(groupId, id)) !== 0) return false;
  }
  return true;
}

// ─── Admin actions ────────────────────────────────────────────────────────────

export async function setMemberRole(
  groupId: string,
  targetUserId: string,
  role: "admin" | "member"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertAdmin(groupId, session.user.id);

  await db
    .update(groupMemberships)
    .set({ role })
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, targetUserId)
      )
    );

  revalidatePath(`/groups/${groupId}`);
}

export async function removeMember(groupId: string, targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertAdmin(groupId, session.user.id);

  const balance = await getUserNetBalanceCents(groupId, targetUserId);
  if (balance !== 0) throw new Error("Cannot remove a member with a non-zero balance");

  await db
    .delete(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, targetUserId)
      )
    );

  revalidatePath(`/groups/${groupId}`);
}

export async function removeGhostFromGroup(groupId: string, ghostId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertAdmin(groupId, session.user.id);

  const balance = await getGhostNetBalanceCents(groupId, ghostId);
  if (balance !== 0) throw new Error("Cannot remove a guest with a non-zero balance");

  await db
    .delete(ghostParticipants)
    .where(eq(ghostParticipants.id, ghostId));

  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertAdmin(groupId, session.user.id);

  if (!(await allGroupBalancesZero(groupId))) {
    throw new Error("Cannot delete a group with unsettled balances");
  }

  await db.delete(groups).where(eq(groups.id, groupId));
  redirect("/groups");
}

async function assertAdmin(groupId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId)
      )
    );
  if (membership?.role !== "admin") throw new Error("Admin access required");
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
