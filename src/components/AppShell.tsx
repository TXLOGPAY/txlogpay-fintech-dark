import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutGrid, Globe, Wallet, Scale, Settings, Search, Bell, HelpCircle, LogOut, Plus,
} from "lucide-react";
import { Logo } from "./Logo";
import { AuthGate } from "./AuthGate";
import { useAuth, signOut } from "@/hooks/use-auth";
import { USER_TIER_BADGE } from "@/types/profile.types";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/operacoes", label: "Operações", icon: Globe },
  { to: "/pagamentos", label: "Pagamentos", icon: Wallet },
  { to: "/alfandega", label: "Alfândega", icon: Scale },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({
  children,
  topbar,
}: {
  children: React.ReactNode;
  topbar?: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const email = profile?.email ?? user?.email ?? "";
  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    email.split("@")[0] ||
    "Usuário";
  const avatarUrl =
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;
  const initials = displayName
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";
  const tier = profile?.tier ?? "STANDARD";
  const tierBadge = USER_TIER_BADGE[tier];

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <AuthGate>
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border px-5 py-6 fixed h-screen">
        <Link to="/dashboard" className="block mb-10">
          <Logo className="h-9" />
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all " +
                  (active
                    ? "btn-primary shadow-[0_0_24px_oklch(0.78_0.16_230/0.35)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent")
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>

        <Link
          to="/operacoes/conectar"
          className="btn-primary rounded-xl px-4 py-3 mt-6 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Nova Operação
        </Link>

        <div className="mt-6 flex items-center gap-3 p-3 rounded-xl glass">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-border" />
          ) : (
            <div className="h-9 w-9 rounded-full grid place-items-center font-semibold text-sm shrink-0" style={{ background: "var(--gradient-brand)" }}>{initials}</div>
          )}
          <div className="text-xs min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate">{displayName}</div>
            <div className="text-muted-foreground font-mono uppercase tracking-wider text-[10px] truncate">{email || "—"}</div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sair"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border">
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex-1 flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar operação, ID ou importador..."
                className="bg-transparent flex-1 outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
            {topbar}
            <button className="relative p-2 rounded-lg hover:bg-sidebar-accent">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-secondary"></span>
            </button>
            <button className="p-2 rounded-lg hover:bg-sidebar-accent"><HelpCircle className="h-4 w-4" /></button>
            <div className="text-xs text-muted-foreground font-mono hidden md:flex items-center gap-1.5">
              <span className="pulse-dot before:inline-block before:mr-1.5"></span>
              UTC-3 São Paulo
            </div>
            <div className="hidden md:flex items-center gap-2 pl-3 ml-1 border-l border-border">
              <span className={`chip ${tierBadge.className}`} title={`Tier ${tierBadge.label}`}>
                {tierBadge.label}
              </span>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <div className="h-8 w-8 rounded-full grid place-items-center font-semibold text-xs" style={{ background: "var(--gradient-brand)" }}>{initials}</div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-10">{children}</main>
        <footer className="px-6 lg:px-10 py-6 text-xs text-muted-foreground border-t border-border flex flex-wrap gap-4 justify-between">
          <span>© 2024 TXLOGPAY Global Trade Systems · Protected by Cargo-Linked Digital Guarantee.</span>
          <div className="flex gap-4">
            <span>Security</span><span>Privacy</span><span>Terms</span>
          </div>
        </footer>
      </div>
    </div>
    </AuthGate>
  );
}

export { LogOut };
