import { describe, it, expect } from "vitest";
import { simplifyDebts, Participant } from "@/lib/balances";

function makeParticipants(ids: string[]): Map<string, Participant> {
  return new Map(ids.map((id) => [id, { id, name: id, type: "user" as const }]));
}

describe("simplifyDebts", () => {
  it("returns no transfers when all balances are zero", () => {
    const balances = new Map([["a", 0], ["b", 0]]);
    const result = simplifyDebts(balances, makeParticipants(["a", "b"]));
    expect(result).toHaveLength(0);
  });

  it("single creditor, single debtor", () => {
    const balances = new Map([["a", 500], ["b", -500]]);
    const result = simplifyDebts(balances, makeParticipants(["a", "b"]));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fromId: "b", toId: "a", amountInCents: 500 });
  });

  it("one creditor, two debtors", () => {
    const balances = new Map([["a", 1000], ["b", -600], ["c", -400]]);
    const result = simplifyDebts(balances, makeParticipants(["a", "b", "c"]));
    expect(result).toHaveLength(2);
    const total = result.reduce((s, t) => s + t.amountInCents, 0);
    expect(total).toBe(1000);
    expect(result.every((t) => t.toId === "a")).toBe(true);
  });

  it("minimises transfers for complex case", () => {
    // a=+300, b=+200, c=-300, d=-200
    const balances = new Map([["a", 300], ["b", 200], ["c", -300], ["d", -200]]);
    const result = simplifyDebts(balances, makeParticipants(["a", "b", "c", "d"]));
    // Greedy: c→a 300, d→b 200 = 2 transfers
    expect(result).toHaveLength(2);
    const total = result.reduce((s, t) => s + t.amountInCents, 0);
    expect(total).toBe(500);
  });
});
