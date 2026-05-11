export interface Participant {
  id: string;
  name: string;
  type: "user" | "ghost";
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountInCents: number;
}

/**
 * Simplifies a set of net balances into the minimum number of transfers.
 * balances: map of participantId → net balance in cents (positive = owed money, negative = owes money)
 * participants: lookup for names
 */
export function simplifyDebts(
  balances: Map<string, number>,
  participants: Map<string, Participant>
): Transfer[] {
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, balance] of balances) {
    if (balance > 0) creditors.push({ id, amount: balance });
    else if (balance < 0) debtors.push({ id, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);

    transfers.push({
      fromId: debtor.id,
      fromName: participants.get(debtor.id)?.name ?? debtor.id,
      toId: creditor.id,
      toName: participants.get(creditor.id)?.name ?? creditor.id,
      amountInCents: amount,
    });

    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return transfers;
}
