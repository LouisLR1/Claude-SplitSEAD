import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getGroupWithMembers,
  setMemberRole,
  removeMember,
  removeGhostFromGroup,
  deleteGroup,
} from "@/actions/groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { AddGhostDialog } from "@/components/add-ghost-dialog";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getAppUrl } from "@/lib/url";
import { ChevronLeft, Ghost, ShieldCheck, Trash2, UserMinus } from "lucide-react";

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

  const {
    group,
    memberships,
    ghosts,
    invite,
    isAdmin,
    currentUserId,
    memberBalances,
    ghostBalances,
    allBalancesZero,
  } = data;

  const appUrl = getAppUrl();
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
            {isAdmin && (
              <div className="flex gap-2 flex-wrap justify-end">
                <InviteMemberDialog groupId={group.id} />
                <AddGhostDialog groupId={group.id} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {memberships.map(({ user, role }) => {
              const isSelf = user.id === currentUserId;
              const balance = memberBalances[user.id] ?? 0;
              const canRemove = isAdmin && !isSelf && balance === 0;

              return (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? ""}
                      width={32}
                      height={32}
                      className="rounded-full shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {user.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}

                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                    {user.name}
                    {isSelf && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {role === "admin" && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                      </Badge>
                    )}

                    {isAdmin && !isSelf && (
                      <form
                        action={async () => {
                          "use server";
                          await setMemberRole(
                            group.id,
                            user.id,
                            role === "admin" ? "member" : "admin"
                          );
                        }}
                      >
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                        >
                          {role === "admin" ? "Remove admin" : "Make admin"}
                        </Button>
                      </form>
                    )}

                    {canRemove && (
                      <ConfirmDialog
                        title="Remove member"
                        description={`Remove ${user.name} from "${group.name}"? They will lose access to this group.`}
                        confirmLabel="Remove"
                        action={async () => {
                          "use server";
                          await removeMember(group.id, user.id);
                        }}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive h-7 px-2"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {ghosts.map((ghost) => {
              const balance = ghostBalances[ghost.id] ?? 0;
              const canRemove = isAdmin && balance === 0;

              return (
                <div key={ghost.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Ghost className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground">{ghost.name}</span>
                    {ghost.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {ghost.email}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-xs text-muted-foreground"
                    >
                      Guest
                    </Badge>

                    {canRemove && (
                      <ConfirmDialog
                        title="Remove guest"
                        description={`Remove "${ghost.name}" from this group? This cannot be undone.`}
                        confirmLabel="Remove"
                        action={async () => {
                          "use server";
                          await removeGhostFromGroup(group.id, ghost.id);
                        }}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive h-7 px-2"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}
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

        {/* Danger zone — admin only */}
        {isAdmin && (
          <section>
            <h2 className="font-semibold text-foreground mb-4">Danger zone</h2>
            <div className="rounded-xl border border-destructive/30 bg-card px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Delete this group
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {allBalancesZero
                    ? "All balances are settled — you can delete this group."
                    : "Settle all balances before deleting."}
                </p>
              </div>
              <ConfirmDialog
                title="Delete group"
                description={`Permanently delete "${group.name}"? All payment history will be lost and this cannot be undone.`}
                confirmLabel="Delete group"
                action={async () => {
                  "use server";
                  await deleteGroup(group.id);
                }}
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!allBalancesZero}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete group
                  </Button>
                }
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
