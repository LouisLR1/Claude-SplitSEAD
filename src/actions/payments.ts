"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { ghostParticipants, groupMemberships, groups, payments, paymentSplits, users } from "@/db/schema";
import { splitEqually } from "@/lib/splits";
import { asc, and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ParticipantRef =
  | { type: "user"; id: string }
  | { type: "ghost"; id: string };

export async function createPayment(
  groupId: string,
  data: {
    amountInCents: number;
    description: string;
    category: string;
    date: string;
    payerUserId?: string;
    payerGhostId?: string;
    participants: ParticipantRef[];
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertMember(groupId, session.user.id);

  if (data.participants.length === 0) {
    return { ok: false, error: "At least one participant is required" };
  }
  if (data.amountInCents <= 0) {
    return { ok: false, error: "Amount must be greater than zero" };
  }

  const participantIds = data.participants.map((p) => p.id);
  const splits = splitEqually(data.amountInCents, participantIds);

  await db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(payments)
      .values({
        groupId,
        payerUserId: data.payerUserId ?? null,
        payerGhostId: data.payerGhostId ?? null,
        amountInCents: data.amountInCents,
        description: data.description,
        category: data.category as "Groceries" | "Restaurants" | "Transport" | "Rent" | "Utilities" | "Entertainment" | "Other" | "Settlement",
        date: new Date(data.date),
      })
      .returning();

    const splitRows = data.participants.map((p) => ({
      paymentId: payment.id,
      userId: p.type === "user" ? p.id : null,
      ghostId: p.type === "ghost" ? p.id : null,
      amountInCents: splits.get(p.id) ?? 0,
    }));

    await tx.insert(paymentSplits).values(splitRows);
  });

  return { ok: true };
}

export async function deletePayment(
  groupId: string,
  paymentId: string
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertMember(groupId, session.user.id);

  await db.delete(payments).where(
    and(eq(payments.id, paymentId), eq(payments.groupId, groupId))
  );

  revalidatePath(`/groups/${await getGroupSlug(groupId)}`);
}

export async function getGroupPayments(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertMember(groupId, session.user.id);

  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.groupId, groupId))
    .orderBy(asc(payments.date), asc(payments.createdAt));

  const payerUsers = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users);

  const payerGhosts = await db
    .select({ id: ghostParticipants.id, name: ghostParticipants.name })
    .from(ghostParticipants)
    .where(eq(ghostParticipants.groupId, groupId));

  const userMap = new Map(payerUsers.map((u) => [u.id, u]));
  const ghostMap = new Map(payerGhosts.map((g) => [g.id, g]));

  return rows.map((p) => ({
    id: p.id,
    description: p.description,
    amountInCents: p.amountInCents,
    category: p.category,
    date: new Date(p.date).toISOString(),
    payerUser: p.payerUserId ? (userMap.get(p.payerUserId) ?? null) : null,
    payerGhost: p.payerGhostId ? (ghostMap.get(p.payerGhostId) ?? null) : null,
  }));
}

async function getGroupSlug(groupId: string): Promise<string> {
  const [g] = await db.select({ slug: groups.slug }).from(groups).where(eq(groups.id, groupId));
  return g?.slug ?? groupId;
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
