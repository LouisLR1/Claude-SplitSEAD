import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getGroupWithMembers } from "@/actions/groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { AddGhostDialog } from "@/components/add-ghost-dialog";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ChevronLeft, Ghost } from "lucide-react";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { groupId } = await params;

  let data;
  try {
    data = await getGroupWithMembers(groupId);
  } catch {
    redirect("/groups");
  }

  const { group, members, ghosts, invite } = data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = invite ? `${appUrl}/join/${invite.token}` : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/groups">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2">
              <ChevronLeft className="h-4 w-4" />
              Groups
            </Button>
          </Link>
          <span className="font-semibold text-foreground">{group.name}</span>
          <Badge variant="outline" className="text-xs">
            {group.currency}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        {/* Members */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Members</h2>
            <div className="flex gap-2 flex-wrap justify-end">
              <InviteMemberDialog groupId={group.id} />
              <AddGhostDialog groupId={group.id} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name ?? ""}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {member.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="text-sm text-foreground">{member.name}</span>
                {member.id === session.user?.id && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    You
                  </Badge>
                )}
              </div>
            ))}

            {ghosts.map((ghost) => (
              <div key={ghost.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Ghost className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <span className="text-sm text-foreground">{ghost.name}</span>
                  {ghost.email && (
                    <p className="text-xs text-muted-foreground">{ghost.email}</p>
                  )}
                </div>
                <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">
                  Guest
                </Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Invite link */}
        {joinUrl && (
          <section>
            <h2 className="font-semibold text-foreground mb-4">Invite link</h2>
            <div className="rounded-xl border border-border bg-card px-4 py-4">
              <p className="text-xs text-muted-foreground mb-3">
                Anyone with this link can join the group.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded truncate max-w-xs">
                  {joinUrl}
                </code>
                <CopyLinkButton url={joinUrl} />
              </div>
            </div>
          </section>
        )}

        {/* Payments placeholder */}
        <section>
          <h2 className="font-semibold text-foreground mb-4">Payments</h2>
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No payments yet. Add one to get started.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
