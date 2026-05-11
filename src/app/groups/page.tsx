import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { getUserGroups } from "@/actions/groups";
import { Users } from "lucide-react";

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const userGroups = await getUserGroups();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-base font-semibold tracking-tight text-foreground">
            SplitSEAD
          </span>
          <div className="flex items-center gap-3">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-border"
              />
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {session.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Your groups</h2>
          <CreateGroupDialog />
        </div>

        {userGroups.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No groups yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {userGroups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.slug}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:bg-accent transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{group.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.currency}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
