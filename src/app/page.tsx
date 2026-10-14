import { Badge } from "@/shared/ui/Badge";

export default function HomePage() {
  return (
    <main
      data-testid="skeleton-landing"
      className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <h1 className="text-2xl font-semibold text-foreground">CondoHub</h1>
      <Badge variant="neutral">Walking skeleton</Badge>
      <p className="max-w-md text-sm text-muted-foreground">
        The design foundation is live. The resident and admin workspaces are under construction.
      </p>
    </main>
  );
}
