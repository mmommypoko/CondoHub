import type { ReactNode } from 'react';
import { Home } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary">
          <Home aria-hidden="true" className="size-5 text-primary-foreground" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">CondoHub</h1>
        <p className="text-sm leading-6 text-muted-foreground">Condominium community management</p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
