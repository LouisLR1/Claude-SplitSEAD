"use client";

import { useState } from "react";
import { addGhostParticipant } from "@/actions/groups";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

export function AddGhostDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await addGhostParticipant(groupId, formData);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <UserPlus className="h-4 w-4 mr-1" />
        Add guest
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a guest</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Guests don't need an account. If they sign up later with the same
          email, their balances will merge automatically.
        </p>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Alex" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="alex@example.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Adding…" : "Add guest"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
