"use client";

import { deletePayment } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Trash2 } from "lucide-react";

interface Payment {
  id: string;
  description: string;
  amountInCents: number;
  category: string;
  date: string;
  payerUser: { id: string; name: string | null } | null;
  payerGhost: { id: string; name: string } | null;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Groceries: "🛒",
  Restaurants: "🍽️",
  Transport: "🚌",
  Rent: "🏠",
  Utilities: "💡",
  Entertainment: "🎬",
  Settlement: "💸",
  Other: "📦",
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PaymentList({
  groupId,
  payments,
  currency,
}: {
  groupId: string;
  payments: Payment[];
  currency: string;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No payments yet. Add one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
      {payments.map((p) => {
        const payerName = p.payerUser?.name ?? p.payerGhost?.name ?? "Unknown";
        const emoji = CATEGORY_EMOJI[p.category] ?? "📦";

        return (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {p.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {payerName} · {formatDate(p.date)}
              </p>
            </div>
            <div className="text-right shrink-0 mr-2">
              <p className="text-sm font-semibold text-foreground">
                {currency} {formatCents(p.amountInCents)}
              </p>
            </div>
            <ConfirmDialog
              title="Delete payment"
              description={`Delete "${p.description}"? This will update all balances.`}
              confirmLabel="Delete"
              action={() => deletePayment(groupId, p.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-7 w-7 p-0 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
