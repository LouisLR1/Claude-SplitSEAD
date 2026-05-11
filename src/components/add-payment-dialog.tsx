"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPayment } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

interface Member {
  id: string;
  name: string;
  type: "user" | "ghost";
}

const CATEGORIES = [
  "Groceries",
  "Restaurants",
  "Transport",
  "Rent",
  "Utilities",
  "Entertainment",
  "Other",
  "Settlement",
] as const;

export function AddPaymentDialog({
  groupId,
  members,
  currentUserId,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payerId, setPayerId] = useState(currentUserId);
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );
  const [category, setCategory] = useState("Other");

  function toggleParticipant(id: string) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setPayerId(currentUserId);
    setParticipants(new Set(members.map((m) => m.id)));
    setCategory("Other");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amountStr = (fd.get("amount") as string).replace(",", ".");
    const amountInCents = Math.round(parseFloat(amountStr) * 100);

    const payer = members.find((m) => m.id === payerId);
    const participantRefs = members
      .filter((m) => participants.has(m.id))
      .map((m) => ({ type: m.type, id: m.id }));

    setPending(true);
    setError(null);
    try {
      const result = await createPayment(groupId, {
        amountInCents,
        description: fd.get("description") as string,
        category,
        date: fd.get("date") as string,
        payerUserId: payer?.type === "user" ? payer.id : undefined,
        payerGhostId: payer?.type === "ghost" ? payer.id : undefined,
        participants: participantRefs,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusCircle className="h-4 w-4 mr-1" />
        Add payment
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Amount + Description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={today}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="Dinner, groceries…"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm">{category}</span>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payer */}
          <div className="space-y-1.5">
            <Label>Paid by</Label>
            <Select value={payerId} onValueChange={(v) => v && setPayerId(v)}>
              <SelectTrigger>
                <span className="flex-1 text-left text-sm">
                  {members.find((m) => m.id === payerId)?.name ?? "Select payer"}
                  {payerId === currentUserId ? " (you)" : ""}
                </span>
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                    {m.id === currentUserId ? " (you)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Split between</Label>
              <button
                type="button"
                onClick={() =>
                  setParticipants(
                    participants.size === members.length
                      ? new Set()
                      : new Set(members.map((m) => m.id))
                  )
                }
                className="text-xs text-primary hover:underline"
              >
                {participants.size === members.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>
            <div className="rounded-lg border border-border divide-y divide-border">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30"
                >
                  <Checkbox
                    checked={participants.has(m.id)}
                    onCheckedChange={() => toggleParticipant(m.id)}
                  />
                  <span className="text-sm text-foreground">
                    {m.name}
                    {m.id === currentUserId ? (
                      <span className="text-muted-foreground"> (you)</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Adding…" : "Add payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
