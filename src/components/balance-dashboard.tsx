"use client";

import { simplifyDebts, type Participant } from "@/lib/balances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight } from "lucide-react";

interface BalanceEntry {
  id: string;
  name: string;
  type: "user" | "ghost";
  balanceInCents: number;
}

function formatCents(cents: number, currency: string): string {
  const abs = Math.abs(cents / 100).toFixed(2);
  return `${currency} ${abs}`;
}

export function BalanceDashboard({
  balances,
  currency,
}: {
  balances: BalanceEntry[];
  currency: string;
}) {
  const participantMap = new Map<string, Participant>(
    balances.map((b) => [b.id, { id: b.id, name: b.name, type: b.type }])
  );
  const balanceMap = new Map(balances.map((b) => [b.id, b.balanceInCents]));
  const transfers = simplifyDebts(balanceMap, participantMap);

  return (
    <Tabs defaultValue="balances">
      <TabsList className="mb-4">
        <TabsTrigger value="balances">Balances</TabsTrigger>
        <TabsTrigger value="settlements">Who pays whom</TabsTrigger>
      </TabsList>

      <TabsContent value="balances">
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {balances.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{b.name}</span>
              <span
                className={
                  b.balanceInCents > 0
                    ? "text-sm font-semibold text-emerald-400"
                    : b.balanceInCents < 0
                    ? "text-sm font-semibold text-red-400"
                    : "text-sm text-muted-foreground"
                }
              >
                {b.balanceInCents > 0
                  ? `+${formatCents(b.balanceInCents, currency)}`
                  : b.balanceInCents < 0
                  ? `-${formatCents(b.balanceInCents, currency)}`
                  : "settled"}
              </span>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="settlements">
        {transfers.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">All settled up!</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {transfers.map((t, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm font-medium text-foreground">
                  {t.fromName}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">
                  {t.toName}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCents(t.amountInCents, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
