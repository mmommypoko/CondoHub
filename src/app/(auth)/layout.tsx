import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold text-foreground">CondoHub</h1>
        <p className="text-sm text-muted-foreground">Condominium community management</p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
