import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Lock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import heroImage from "@/assets/login-hero.jpg";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — TXLOGPAY" },
      { name: "description", content: "Solicite acesso à plataforma TXLOGPAY." },
    ],
  }),
  component: Signup,
});

const schema = z
  .object({
    email: z.string().trim().email("E-mail inválido").max(255),
    password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({ email, password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setSubmitting(true);
    const { error: err } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setSubmitting(false);

    if (err) {
      setError(err.message);
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
        <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden rounded-3xl">
          <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.18 0.10 270 / 0.55) 0%, oklch(0.14 0.10 270 / 0.75) 100%)" }} />
          <Logo className="relative z-10 h-10" />
          <div className="relative z-10 max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.05] drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
              Solicite acesso à infraestrutura financeira do comércio exterior.
            </h1>
            <p className="mt-5 text-sm xl:text-base text-muted-foreground max-w-md">
              Sua conta é provisionada em ambiente demonstrativo com Cargo-linked protection ativa.
            </p>
          </div>
          <p className="relative z-10 text-[11px] font-mono tracking-wider text-muted-foreground">
            © 2024 TXLOGPAY GLOBAL TRADE SYSTEMS
          </p>
        </div>

        <div className="relative flex items-center justify-center p-6 md:p-10 rounded-3xl bg-[color-mix(in_oklab,var(--surface-container-lowest)_80%,transparent)]">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md card-surface p-8 md:p-10">
            <div className="text-center">
              <Logo className="h-9 mx-auto lg:hidden mb-6" />
              <span className="chip chip-info">Ambiente Demonstrativo</span>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">Criar conta</h2>
              <p className="text-sm text-muted-foreground mt-2">Comece em segundos. Mínimo 8 caracteres na senha.</p>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="mt-8 w-full rounded-xl py-3 font-medium flex items-center justify-center gap-3 border border-border hover:border-secondary/40 hover:bg-surface-container transition"
            >
              <GoogleIcon /> Continuar com Google
            </button>

            <div className="my-6 flex items-center gap-3 text-[10px] font-mono tracking-widest text-muted-foreground">
              <span className="flex-1 h-px bg-border" /> OU <span className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="E-mail Corporativo">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com.br" className={inputCls} />
              </Field>
              <Field label="Senha">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={inputCls} />
              </Field>
              <Field label="Confirme a senha">
                <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className={inputCls} />
              </Field>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {submitting ? "Criando..." : (<>Criar conta <ArrowRight className="h-4 w-4" /></>)}
              </button>
            </form>

            <div className="text-center mt-8 text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-secondary font-semibold hover:underline">Entrar</Link>
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

const inputCls =
  "w-full bg-transparent border-b border-border focus:border-secondary outline-none py-2.5 mt-1.5 text-sm transition-colors placeholder:text-muted-foreground/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
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
