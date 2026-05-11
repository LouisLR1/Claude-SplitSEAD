import { auth, signIn } from "@/auth";
import { db } from "@/db";
import { ghostParticipants, groupMemberships, groups, invites } from "@/db/schema";
import { joinGroupAsGhost, joinGroupAsNew } from "@/actions/groups";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Ghost, UserCircle } from "lucide-react";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [row] = await db
    .select({ invite: invites, group: groups })
    .from(invites)
    .innerJoin(groups, eq(invites.groupId, groups.id))
    .where(eq(invites.token, token));

  if (!row) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Invalid or expired invite link.</p>
      </main>
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/40 text-center">
          <p className="text-sm text-muted-foreground mb-1">You're invited to join</p>
          <h1 className="text-2xl font-bold text-foreground mb-6">{row.group.name}</h1>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: `/join/${token}` });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Sign in with Google to join
            </Button>
          </form>
        </div>
      </main>
    );
  }

  const userId = session.user.id!;

  // Already a member — go straight to the group
  const [existing] = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, row.group.id),
        eq(groupMemberships.userId, userId)
      )
    );

  if (existing) redirect(`/groups/${row.group.slug}`);

  // Unclaimed ghosts (no real user linked yet)
  const ghosts = await db
    .select()
    .from(ghostParticipants)
    .where(eq(ghostParticipants.groupId, row.group.id));

  const groupId = row.group.id;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">Joining</p>
          <h1 className="text-2xl font-bold text-foreground">{row.group.name}</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Who are you in this group?
          </p>
        </div>

        {ghosts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">
              Select your name
            </p>
            {ghosts.map((ghost) => (
              <form
                key={ghost.id}
                action={async () => {
                  "use server";
                  await joinGroupAsGhost(groupId, ghost.id);
                }}
              >
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-accent hover:border-primary/50 transition-colors group"
                >
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Ghost className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{ghost.name}</p>
                    {ghost.email && (
                      <p className="text-xs text-muted-foreground">{ghost.email}</p>
                    )}
                  </div>
                </button>
              </form>
            ))}
          </div>
        )}

        <div className={ghosts.length > 0 ? "pt-2 border-t border-border" : ""}>
          {ghosts.length > 0 && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 mb-2 mt-3">
              Or join as new
            </p>
          )}
          <form
            action={async () => {
              "use server";
              await joinGroupAsNew(groupId);
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-accent hover:border-primary/50 transition-colors group"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {session.user.name ?? "Me"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
