import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Globe2,
  Layers,
  Network,
  Lock,
  Activity,
  Banknote,
  FileSearch,
  Workflow,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Clock,
  Building2,
  Code2,
  LineChart,
  Scale,
  Mail,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TXLOGPAY — Pagamentos internacionais com garantia operacional" },
      {
        name: "description",
        content:
          "Plataforma de pagamentos internacionais para importadores. Proteja o valor da operação, acompanhe a logística e libere o pagamento apenas após a confirmação operacional.",
      },
      { property: "og:title", content: "TXLOGPAY — Infraestrutura financeira para comércio exterior" },
      {
        property: "og:description",
        content:
          "Centralize pagamentos internacionais com acompanhamento operacional, liberação condicionada e trilha financeira auditável.",
      },
    ],
  }),
  component: Landing,
});

const COMPARISON = [
  { label: "Custo médio da operação", legacy: "1,5% – 3,0% + tarifas", tx: "1,00% – 1,50% all-in" },
  { label: "Tempo de emissão / setup", legacy: "5 – 15 dias úteis", tx: "Minutos (self-service)" },
  { label: "Liberação ao exportador", legacy: "Documental, manual", tx: "Automática por evento" },
  { label: "Risco de contraparte", legacy: "Mitigado por banco emissor", tx: "Mitigado por garantia operacional" },
  { label: "Trilha de auditoria", legacy: "Documentos físicos e SWIFT", tx: "Histórico financeiro centralizado" },
  { label: "Capital de giro", legacy: "Bloqueado em colateral", tx: "Liberado por etapa logística" },
];

const FLOW = [
  { icon: FileSearch, title: "Operação registrada", desc: "O importador conecta a operação e define o beneficiário internacional." },
  { icon: Lock, title: "Pagamento protegido", desc: "O valor é reservado e fica indisponível até a confirmação da operação." },
  { icon: Activity, title: "Acompanhamento logístico", desc: "Eventos aduaneiros e de transporte são monitorados em tempo real." },
  { icon: Workflow, title: "Validação operacional", desc: "Cada etapa logística confirmada libera uma fração do pagamento." },
  { icon: Banknote, title: "Liberação ao exportador", desc: "Pagamento liberado automaticamente após a confirmação final da carga." },
];

const BENEFITS = [
  { icon: ShieldCheck, title: "Redução de risco de fraude", desc: "Pagamento vinculado à confirmação real de movimentação da carga." },
  { icon: Globe2, title: "Liquidação internacional rápida", desc: "Liberação cross-border em minutos, sem espera por intermediários." },
  { icon: Scale, title: "Compliance auditável", desc: "Trilha financeira aderente a SISBACEN, AML e políticas internas de procurement." },
  { icon: Network, title: "Integração logística", desc: "APIs com ERPs, TMS, despachantes e provedores de tracking marítimo." },
  { icon: Layers, title: "Reserva operacional segregada", desc: "Fundos segregados em estrutura financeira regulada e auditada." },
  { icon: Workflow, title: "Liberação programada", desc: "Regras de liberação por evento — parcial, total ou condicional." },
  { icon: FileSearch, title: "Histórico centralizado", desc: "Cada evento registrado para auditoria, disputa e governança." },
  { icon: TrendingDown, title: "Economia vs carta de crédito", desc: "Até 60% de redução de custo financeiro frente a LC tradicional." },
];

const PLANS = [
  {
    name: "Starter",
    volume: "Até US$ 500k / mês",
    rate: "1,50%",
    features: ["Self-service", "Até 3 usuários", "Onboarding automático", "4 etapas operacionais", "Suporte por e-mail"],
    cta: "Começar agora",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Growth",
    volume: "US$ 500k – 5M / mês",
    rate: "1,25%",
    features: ["Até 10 usuários", "SLA 4h", "Integrações ERP / TMS", "Etapas ilimitadas", "CSM compartilhado"],
    cta: "Falar com especialista",
    href: "/contato",
    highlight: true,
  },
  {
    name: "Enterprise",
    volume: "Acima de US$ 5M / mês",
    rate: "1,00%",
    features: ["Usuários ilimitados", "SLA 1h", "API white-label", "Contrato anual", "CSM dedicado", "Compliance avançado"],
    cta: "Falar com especialista",
    href: "/contato",
    highlight: false,
  },
];

const MODULES = [
  { name: "Liberação multietapa", price: "+0,10%", desc: "Pagamento fracionado por evento logístico confirmado." },
  { name: "Webhooks em tempo real", price: "+0,05%", desc: "Notificações de eventos para sistemas internos." },
  { name: "Mediação de disputas", price: "+0,15%", desc: "Arbitragem operacional com histórico completo da operação." },
  { name: "Compliance SISBACEN / AML", price: "+0,08%", desc: "Reporting regulatório e screening contínuo." },
];

const BUYERS = [
  {
    icon: Code2,
    tag: "Starter / Dev",
    title: "Times técnicos e early adopters",
    points: ["Trial rápido", "Sandbox completo", "API REST simples", "SDK TypeScript"],
  },
  {
    icon: LineChart,
    tag: "Growth / CFO",
    title: "Diretores financeiros",
    points: ["ROI claro vs carta de crédito", "Libera capital de giro", "Reduz custo financeiro", "Previsibilidade de fluxo"],
  },
  {
    icon: Building2,
    tag: "Enterprise / Procurement",
    title: "Procurement e governança",
    points: ["Trilha financeira auditável", "Controles de compliance", "Governança operacional", "Histórico verificável"],
  },
];

const COMPLIANCE = [
  { icon: FileSearch, title: "Rastreabilidade operacional", desc: "Cada operação registrada com identificador verificável e histórico completo." },
  { icon: ShieldCheck, title: "AML & KYC contínuos", desc: "Screening em todas as contrapartes e beneficiários internacionais." },
  { icon: Scale, title: "SISBACEN ready", desc: "Estrutura preparada para reporting cambial e regulatório." },
  { icon: Activity, title: "Auditoria financeira", desc: "Eventos logísticos, financeiros e operacionais correlacionados." },
];

function Landing() {
  const [volume, setVolume] = useState<number>(2_000_000);
  const savings = useMemo(() => {
    const lcCost = volume * 0.025;
    const txCost = volume * 0.0125;
    const saved = lcCost - txCost;
    const annual = saved * 12;
    return { monthly: saved, annual, lcCost, txCost };
  }, [volume]);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-8" />
            <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em] hidden sm:inline">
              Pagamentos Internacionais
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#problema" className="hover:text-foreground transition">Problema</a>
            <a href="#fluxo" className="hover:text-foreground transition">Como funciona</a>
            <a href="#beneficios" className="hover:text-foreground transition">Benefícios</a>
            <a href="#planos" className="hover:text-foreground transition">Planos</a>
            <a href="#economia" className="hover:text-foreground transition">Economia</a>
            <a href="#compliance" className="hover:text-foreground transition">Compliance</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition">Entrar</Link>
            <Link to="/signup" className="btn-primary rounded-md px-4 py-2 text-sm font-semibold">
              Falar com especialista
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <span className="chip chip-info">Trade Finance · Importação · Pagamentos</span>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Pagamentos internacionais com{" "}
              <span className="text-gradient">garantia operacional</span> integrada.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Centralize pagamentos internacionais com acompanhamento operacional e liberação
              condicionada da operação. Mais segurança, menos custo e previsibilidade total
              para importações.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary rounded-md px-6 py-3 font-semibold inline-flex items-center gap-2">
                Falar com especialista <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#fluxo" className="rounded-md px-6 py-3 font-semibold border border-border hover:bg-surface-container transition">
                Ver como funciona
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-xl">
              {[
                { k: "60%", v: "Economia vs LC" },
                { k: "<10s", v: "Liberação ao exportador" },
                { k: "100%", v: "Auditável" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-2xl md:text-3xl font-bold text-gradient">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-mono">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Mock operational panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <div className="card-surface p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  <span className="pulse-dot relative pl-4" />
                  Operação ativa
                </div>
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground">TX-2026-0481</span>
              </div>
              <div className="mt-5">
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Pagamento protegido</div>
                <div className="text-3xl font-bold mt-1">USD 1.240.500,00</div>
                <div className="mt-1 text-xs text-muted-foreground">Beneficiário: Shenzhen Trade Co.</div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  { t: "Operação criada", s: "Siscomex sincronizado", c: "chip-success" },
                  { t: "Pagamento protegido", s: "Reserva confirmada", c: "chip-info" },
                  { t: "Embarque confirmado", s: "BL MSC-RX9821", c: "chip-success" },
                  { t: "Desembaraço pendente", s: "Aguardando canal", c: "chip-warning" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg glass px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{r.t}</div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{r.s}</div>
                    </div>
                    <span className={"chip " + r.c}>{r.c.replace("chip-", "")}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Workflow className="h-3.5 w-3.5" /> Liberação programada
                </div>
                <span className="font-mono text-secondary">3/5 etapas confirmadas</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-surface-container-low/40">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-6">
          <span className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
            Compatível com
          </span>
          <div className="flex flex-wrap gap-6 opacity-70">
            {["SISCOMEX", "SWIFT GPI", "MAERSK", "MSC", "SAP", "ORACLE", "TOTVS"].map((n) => (
              <span key={n} className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Problema de mercado */}
      <section id="problema" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <span className="chip chip-info">Problema de mercado</span>
          <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
            Comércio exterior ainda opera com infraestrutura financeira do século passado.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cartas de crédito, intermediação bancária e conciliação manual travam capital,
            aumentam custo e mantêm risco operacional elevado.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-2 gap-6">
          <div className="card-surface p-8">
            <div className="flex items-center gap-2 text-destructive font-mono text-xs uppercase tracking-widest">
              <XCircle className="h-4 w-4" /> Sistema tradicional
            </div>
            <h3 className="mt-3 text-xl font-semibold">Carta de crédito & SWIFT</h3>
            <ul className="mt-6 space-y-3 text-sm">
              {COMPARISON.map((c) => (
                <li key={c.label} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="text-right">{c.legacy}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="card-surface p-8 relative overflow-hidden"
            style={{ borderColor: "color-mix(in oklab, var(--primary-glow) 35%, transparent)" }}
          >
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ background: "var(--gradient-brand-soft)" }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-secondary font-mono text-xs uppercase tracking-widest">
                <CheckCircle2 className="h-4 w-4" /> TXLOGPAY
              </div>
              <h3 className="mt-3 text-xl font-semibold">Pagamento protegido por evento operacional</h3>
              <ul className="mt-6 space-y-3 text-sm">
                {COMPARISON.map((c) => (
                  <li key={c.label} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="text-right font-medium">{c.tx}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="fluxo" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <span className="chip chip-info">Como funciona</span>
          <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
            Cinco etapas, uma trilha auditável.
          </h2>
          <p className="mt-4 text-muted-foreground">
            O pagamento é programado para liberação automática conforme os eventos logísticos
            são confirmados pela infraestrutura aduaneira e portuária.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {FLOW.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="card-surface card-surface-hover p-5 relative"
            >
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                ETAPA {String(i + 1).padStart(2, "0")}
              </div>
              <f.icon className="h-6 w-6 mt-3 text-secondary" />
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <span className="chip chip-info">Benefícios</span>
          <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
            Infraestrutura institucional para operações cross-border.
          </h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card-surface card-surface-hover p-6">
              <b.icon className="h-6 w-6 text-secondary" />
              <div className="mt-4 font-semibold">{b.title}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <span className="chip chip-info">Planos</span>
          <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
            Pricing por volume operacional.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Taxa única all-in sobre o valor liquidado. Sem mensalidades, sem setup, sem custos ocultos.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                "card-surface p-8 relative " +
                (p.highlight ? "ring-1 ring-primary-glow/40 shadow-[var(--shadow-glow-primary)]" : "")
              }
            >
              {p.highlight && (
                <span className="chip chip-cargo absolute -top-3 left-6">Mais escolhido</span>
              )}
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{p.name}</div>
              <div className="mt-2 text-sm text-muted-foreground">{p.volume}</div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gradient">{p.rate}</span>
                <span className="text-sm text-muted-foreground">all-in</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={p.href}
                className={
                  "mt-8 w-full inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition " +
                  (p.highlight
                    ? "btn-primary"
                    : "border border-border hover:bg-surface-container")
                }
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Módulos adicionais */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <span className="chip chip-info">Módulos de expansão</span>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
              Ative apenas o que sua operação precisa.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Módulos opcionais somados à taxa base — sem contrato adicional, sem implementação técnica.
            </p>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            {MODULES.map((m) => (
              <div key={m.name} className="card-surface p-6 flex justify-between items-start gap-4">
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                </div>
                <span className="font-mono text-sm text-secondary whitespace-nowrap">{m.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buyers */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <span className="chip chip-info">Quem utiliza</span>
          <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
            Construído para times financeiros, técnicos e de procurement.
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {BUYERS.map((b) => (
            <div key={b.tag} className="card-surface p-6">
              <div className="flex items-center gap-2">
                <b.icon className="h-5 w-5 text-secondary" />
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">{b.tag}</span>
              </div>
              <div className="mt-4 text-lg font-semibold">{b.title}</div>
              <ul className="mt-4 space-y-2 text-sm">
                {b.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Calculadora de economia */}
      <section id="economia" className="max-w-7xl mx-auto px-6 py-24">
        <div className="card-surface p-8 md:p-12 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="chip chip-info">Calculadora</span>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
              Quanto sua empresa economiza vs carta de crédito?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Compare o custo financeiro estimado de LC tradicional (2,5%) com a taxa TXLOGPAY Growth (1,25%).
            </p>

            <label htmlFor="volume-input" className="block mt-8 text-sm font-mono uppercase tracking-widest text-muted-foreground">
              Volume mensal (USD)
            </label>
            <div className="relative mt-2 group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm pointer-events-none transition-colors group-focus-within:text-foreground">
                US$
              </span>
              <Input
                id="volume-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={volume ? volume.toLocaleString("en-US") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setVolume(digits ? Number(digits) : 0);
                }}
                placeholder="0"
                className="h-14 pl-14 pr-4 text-2xl font-semibold tracking-tight tabular-nums transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000].map((v) => (
                <button
                  key={v}
                  onClick={() => setVolume(v)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-md border transition ${
                    volume === v
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border hover:bg-surface-container"
                  }`}
                >
                  US$ {(v / 1_000_000).toFixed(1)}M
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl glass p-6">
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Economia mensal estimada
              </div>
              <div className="mt-2 text-4xl md:text-5xl font-bold text-gradient tabular-nums transition-all duration-300">
                US$ {savings.monthly.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl glass p-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Economia anual
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums transition-all duration-300">
                  US$ {savings.annual.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="rounded-xl glass p-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Tempo de liberação
                </div>
                <div className="mt-1 text-xl font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-secondary" /> ~10s
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono tabular-nums">
              Custo LC: US$ {savings.lcCost.toLocaleString("en-US", { maximumFractionDigits: 0 })} ·
              Custo TXLOGPAY: US$ {savings.txCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <span className="chip chip-info">Compliance & Governança</span>
          <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
            Rastreabilidade operacional e governança financeira por design.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cada evento financeiro e logístico é registrado em histórico verificável, com integração
            nativa a fluxos regulatórios brasileiros e internacionais.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPLIANCE.map((c) => (
            <div key={c.title} className="card-surface p-6">
              <c.icon className="h-6 w-6 text-secondary" />
              <div className="mt-4 font-semibold">{c.title}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div
          className="card-surface p-10 md:p-14 text-center relative overflow-hidden"
          style={{ borderColor: "color-mix(in oklab, var(--primary-glow) 30%, transparent)" }}
        >
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{ background: "var(--gradient-brand-soft)" }}
          />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
              Pronto para substituir sua carta de crédito por pagamento protegido?
            </h2>
            <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
              Fale com nosso time de trade finance para uma análise de redução de custo e desenho
              operacional sob medida.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="btn-primary rounded-md px-7 py-3.5 font-semibold inline-flex items-center gap-2">
                Falar com especialista <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/dashboard" className="rounded-md px-7 py-3.5 font-semibold border border-border hover:bg-surface-container transition">
                Ver demonstração
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <Logo className="h-7" />
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              Infraestrutura financeira moderna para comércio exterior.
              Pagamento protegido, liberação programada e compliance auditável.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-3">Plataforma</div>
            <ul className="space-y-2 text-muted-foreground text-xs">
              <li><a href="#fluxo" className="hover:text-foreground">Como funciona</a></li>
              <li><a href="#beneficios" className="hover:text-foreground">Benefícios</a></li>
              <li><a href="#planos" className="hover:text-foreground">Planos</a></li>
              <li><a href="#economia" className="hover:text-foreground">Calculadora</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Institucional</div>
            <ul className="space-y-2 text-muted-foreground text-xs">
              <li>Compliance</li>
              <li>Segurança</li>
              <li>Privacidade</li>
              <li>Termos</li>
            </ul>
          </div>
          <div className="md:text-right text-muted-foreground text-xs space-y-2">
            <div>© 2026 TXLOGPAY Global Trade Systems.</div>
            <div className="flex md:justify-end items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> contato@txlogpay.com
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
