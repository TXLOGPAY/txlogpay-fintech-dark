import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "./Logo";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-10 opacity-80" />
          <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full w-1/2 animate-pulse rounded-full"
              style={{ background: "var(--gradient-brand)" }}
            />
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Verificando sessão
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
