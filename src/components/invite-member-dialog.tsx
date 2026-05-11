"use client";

import { useState } from "react";
import { inviteMemberByEmail } from "@/actions/groups";
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
import { Mail } from "lucide-react";

export function InviteMemberDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await inviteMemberByEmail(groupId, formData);
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1500);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Mail className="h-4 w-4 mr-1" />
        Invite by email
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite by email</DialogTitle>
        </DialogHeader>
        {sent ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Invite sent!
          </p>
        ) : (
          <form action={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="friend@example.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
