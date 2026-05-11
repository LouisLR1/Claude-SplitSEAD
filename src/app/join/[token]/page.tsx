import { auth, signIn } from "@/auth";
import { db } from "@/db";
import { groupMemberships, groups, invites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [invite] = await db
    .select({ invite: invites, group: groups })
    .from(invites)
    .innerJoin(groups, eq(invites.groupId, groups.id))
    .where(eq(invites.token, token));

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid or expired invite link.</p>
        </div>
      </main>
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/40 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            You're invited to join
          </h1>
          <p className="text-2xl font-bold text-primary mb-6">
            {invite.group.name}
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", {
                redirectTo: `/join/${token}`,
              });
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

  // Already a member?
  const [existing] = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, invite.group.id),
        eq(groupMemberships.userId, session.user.id)
      )
    );

  if (!existing) {
    await db.insert(groupMemberships).values({
      groupId: invite.group.id,
      userId: session.user.id,
      role: "member",
    });
  }

  redirect(`/groups/${invite.group.id}`);
}
