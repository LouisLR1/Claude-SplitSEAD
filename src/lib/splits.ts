/**
 * Splits amountInCents equally among participantIds using penny-rounding.
 * Remainder cents are distributed to the first N participants (sorted by ID for stability).
 * Returns a map of participantId → amountInCents owed.
 */
export function splitEqually(
  amountInCents: number,
  participantIds: string[]
): Map<string, number> {
  const n = participantIds.length;
  if (n === 0) return new Map();

  const sorted = [...participantIds].sort();
  const base = Math.floor(amountInCents / n);
  const remainder = amountInCents - base * n;

  const result = new Map<string, number>();
  sorted.forEach((id, i) => {
    result.set(id, base + (i < remainder ? 1 : 0));
  });
  return result;
}
