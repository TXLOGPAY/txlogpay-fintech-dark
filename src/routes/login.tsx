import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Lock, AlertCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";
import { z } from "zod";
import heroImage from "@/assets/login-hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — TXLOGPAY" },
      { name: "description", content: "Acesse a plataforma TXLOGPAY com suas credenciais corporativas." },
      { property: "og:title", content: "Entrar — TXLOGPAY" },
      { property: "og:description", content: "Acesse a plataforma TXLOGPAY com suas credenciais corporativas." },
    ],
  }),
  component: Login,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, skip to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);

    if (err) {
      const msg =
        err.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : err.message;
      setError(msg);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setError("Falha ao conectar com Google. Tente novamente.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen w-full p-3 md:p-6 lg:p-8">
      <div className="grid lg:grid-cols-2 gap-6 min-h-[calc(100vh-3rem)] rounded-3xl overflow-hidden border border-border/60">
        {/* Left: imersive illustrated panel */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden rounded-3xl">
          {/* Illustration background */}
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            width={1024}
            height={1216}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Tints & gradients for depth */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.18 0.10 270 / 0.55) 0%, oklch(0.16 0.10 270 / 0.35) 40%, oklch(0.14 0.10 270 / 0.75) 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(circle at 80% 10%, oklch(0.70 0.24 320 / 0.35) 0%, transparent 45%), radial-gradient(circle at 10% 90%, oklch(0.65 0.20 265 / 0.40) 0%, transparent 50%)",
            }}
          />

          {/* Header: small logo */}
          <div className="relative z-10 flex items-center justify-between">
            <Logo className="h-10" />
          </div>

          {/* Giant wordmark behind copy */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-[14%] z-0 px-10 select-none"
            aria-hidden="true"
          >
            <div
              className="font-display font-black tracking-tight leading-none text-[14vw] xl:text-[10rem]"
              style={{
                background:
                  "linear-gradient(180deg, oklch(0.98 0.02 270 / 0.18) 0%, oklch(0.65 0.20 265 / 0.06) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextStroke: "1px oklch(1 0 0 / 0.10)",
              }}
            >
              TXLOG<span style={{ WebkitTextStroke: "1px oklch(0.85 0.18 200 / 0.25)" }}>PAY</span>
            </div>
          </div>

          {/* Copy block */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-10 max-w-lg"
          >
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.05] text-foreground drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
              Pagamentos<br />
              internacionais protegidos<br />
              por eventos aduaneiros.
            </h1>
            <p className="mt-5 text-sm xl:text-base text-muted-foreground max-w-md">
              Liquidação automática após aprovação da carga. Segurança institucional
              para fluxos globais de capital.
            </p>
            <div className="mt-8">
              <span className="chip chip-cargo">
                <span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" />
                Cargo-linked protection ativa
              </span>
            </div>
          </motion.div>

          <p className="relative z-10 text-[11px] font-mono tracking-wider text-muted-foreground">
            © 2024 TXLOGPAY GLOBAL TRADE SYSTEMS · A TECNOLOGIA QUE MOVE O COMÉRCIO EXTERIOR
          </p>
        </div>

        {/* Right: form panel */}
        <div className="relative flex items-center justify-center p-6 md:p-10 rounded-3xl bg-[color-mix(in_oklab,var(--surface-container-lowest)_80%,transparent)]">
          <div
            className="absolute inset-0 rounded-3xl opacity-40 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 70% 0%, oklch(0.78 0.16 230 / 0.18) 0%, transparent 55%)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full max-w-md card-surface p-8 md:p-10"
          >
            <div className="text-center">
              <Logo className="h-9 mx-auto lg:hidden mb-6" />
              <span className="chip chip-info">Ambiente Demonstrativo</span>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">Acesse sua conta</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Insira suas credenciais corporativas para continuar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-6">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com.br"
                  className="w-full bg-transparent border-b border-border focus:border-secondary outline-none py-2.5 mt-1.5 text-sm transition-colors placeholder:text-muted-foreground/60"
                />
              </div>
              <div>
                <div className="flex justify-between items-baseline">
                  <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Senha
                  </label>
                  <a className="text-xs text-secondary hover:underline" href="#">
                    Esqueceu a senha?
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-b border-border focus:border-secondary outline-none py-2.5 mt-1.5 text-sm transition-colors placeholder:text-muted-foreground/60"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? "Entrando..." : (<>Entrar <ArrowRight className="h-4 w-4" /></>)}
              </button>

              <button
                type="button"
                onClick={handleGoogle}
                className="w-full rounded-xl py-3 font-medium flex items-center justify-center gap-3 border border-border hover:bg-surface-container hover:border-secondary/40 transition"
              >
                <GoogleIcon /> Continuar com Google
              </button>
            </form>

            <div className="text-center mt-8 text-sm text-muted-foreground">
              Novo na TXLOGPAY?{" "}
              <Link to="/signup" className="text-secondary font-semibold hover:underline">
                Solicite acesso
              </Link>
            </div>
            <div className="text-center mt-5 text-[10px] font-mono text-muted-foreground/70 tracking-[0.18em] flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3" /> SECURE 256-BIT AES ENCRYPTION
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.96h5.52c-.24 1.5-1.74 4.38-5.52 4.38-3.3 0-6-2.76-6-6.18s2.7-6.18 6-6.18c1.92 0 3.18.78 3.9 1.5l2.64-2.58C16.92 3.36 14.7 2.4 12 2.4 6.78 2.4 2.4 6.78 2.4 12s4.38 9.6 9.6 9.6c5.52 0 9.18-3.9 9.18-9.36 0-.66-.06-1.14-.18-1.62H12z" />
    </svg>
  );
}
