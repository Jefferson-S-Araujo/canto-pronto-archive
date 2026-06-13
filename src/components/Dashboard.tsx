import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import {
  Wallet,
  FileText,
  UserCircle,
  Download,
  CheckCircle2,
  Clock,
  Camera,
  KeyRound,
} from "lucide-react";

type Section = "financeiro" | "contratos" | "perfil";

type Invoice = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "pago" | "pendente";
};

const OWNER_INVOICES: Invoice[] = [
  { id: "r1", description: "Recebimento — Apto Barra (Maio)", amount: 2500, dueDate: "05/05/2026", status: "pago" },
  { id: "r2", description: "Recebimento — Estúdio Rio Vermelho (Maio)", amount: 1800, dueDate: "05/05/2026", status: "pago" },
  { id: "r3", description: "Recebimento — Apto Barra (Junho)", amount: 2500, dueDate: "05/06/2026", status: "pendente" },
];

const TENANT_INVOICES: Invoice[] = [
  { id: "p1", description: "Aluguel — Abril/2026", amount: 2500, dueDate: "10/04/2026", status: "pago" },
  { id: "p2", description: "Aluguel — Maio/2026", amount: 2500, dueDate: "10/05/2026", status: "pago" },
  { id: "p3", description: "Aluguel — Junho/2026", amount: 2500, dueDate: "10/06/2026", status: "pendente" },
];

export function Dashboard({ role }: { role: "tenant" | "owner" }) {
  const { user } = useStore();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("financeiro");

  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate({ to: "/entrar" });
    }
  }, [user?.isAuthenticated, navigate]);

  if (!user?.isAuthenticated) return null;

  const title = role === "owner" ? "Painel do Proprietário" : "Painel do Inquilino";

  const items: { key: Section; label: string; icon: typeof Wallet }[] = [
    { key: "financeiro", label: "Financeiro", icon: Wallet },
    { key: "contratos", label: "Contratos Atuais", icon: FileText },
    { key: "perfil", label: "Meu Perfil", icon: UserCircle },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">Olá, {user.name}.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-card p-3 h-fit">
          <nav className="flex md:flex-col gap-1">
            {items.map((it) => {
              const Icon = it.icon;
              const active = section === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => setSection(it.key)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-left transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {it.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section>
          {section === "financeiro" && <Financeiro role={role} />}
          {section === "contratos" && <Contratos role={role} />}
          {section === "perfil" && <Perfil />}
        </section>
      </div>
    </main>
  );
}

function Financeiro({ role }: { role: "tenant" | "owner" }) {
  const base = role === "owner" ? OWNER_INVOICES : TENANT_INVOICES;
  const [invoices, setInvoices] = useState<Invoice[]>(base);
  const heading = role === "owner" ? "Rendimentos / Recebimentos" : "Aluguéis a Pagar";
  const total = invoices.reduce((s, i) => s + (i.status === "pago" ? i.amount : 0), 0);
  const pending = invoices.filter((i) => i.status === "pendente").reduce((s, i) => s + i.amount, 0);

  const pay = (id: string) => {
    setInvoices((arr) => arr.map((i) => (i.id === id ? { ...i, status: "pago" } : i)));
    alert("Pagamento simulado com sucesso!");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">{role === "owner" ? "Total recebido" : "Total pago"}</p>
          <p className="mt-1 text-2xl font-bold text-success">R$ {total.toLocaleString("pt-BR")}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">{role === "owner" ? "A receber" : "A pagar"}</p>
          <p className="mt-1 text-2xl font-bold">R$ {pending.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-3">
          <h2 className="font-semibold">{heading}</h2>
        </div>
        <ul className="divide-y">
          {invoices.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-sm">{i.description}</p>
                <p className="text-xs text-muted-foreground">Vencimento: {i.dueDate}</p>
              </div>
              <span className="text-sm font-semibold">R$ {i.amount.toLocaleString("pt-BR")}</span>
              {i.status === "pago" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning-foreground">
                  <Clock className="h-3.5 w-3.5" /> Pendente
                </span>
              )}
              {role === "tenant" && i.status === "pendente" && (
                <button
                  onClick={() => pay(i.id)}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Pagar agora
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Contratos({ role }: { role: "tenant" | "owner" }) {
  const contracts =
    role === "owner"
      ? [
          {
            id: "c1",
            property: "Apartamento Mobiliado — Barra",
            period: "01/01/2026 – 31/12/2026",
            value: 2500,
            counterpart: { label: "Inquilino vinculado", name: "Maria Souza", email: "maria@email.com" },
          },
          {
            id: "c2",
            property: "Estúdio Completo — Rio Vermelho",
            period: "15/03/2026 – 14/03/2027",
            value: 1800,
            counterpart: { label: "Inquilino vinculado", name: "Carlos Lima", email: "carlos@email.com" },
          },
        ]
      : [
          {
            id: "c1",
            property: "Apartamento Mobiliado — Barra",
            period: "01/01/2026 – 31/12/2026",
            value: 2500,
            counterpart: { label: "Proprietário", name: "João Pereira", email: "joao@email.com" },
          },
        ];

  return (
    <div className="space-y-3">
      {contracts.map((c) => (
        <div key={c.id} className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{c.property}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Vigência: {c.period}</p>
              <p className="text-sm mt-2">
                Valor mensal: <span className="font-semibold">R$ {c.value.toLocaleString("pt-BR")}</span>
              </p>
            </div>
            <button
              onClick={() => alert("Download simulado: contrato-" + c.id + ".pdf")}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              <Download className="h-4 w-4" /> Baixar PDF
            </button>
          </div>
          <div className="mt-4 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">{c.counterpart.label}</p>
            <p className="text-sm font-semibold mt-0.5">{c.counterpart.name}</p>
            <p className="text-xs text-muted-foreground">{c.counterpart.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Perfil() {
  const { user } = useStore();
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatar(URL.createObjectURL(f));
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cur || !nw || !conf) return alert("Preencha todos os campos.");
    if (nw !== conf) return alert("Nova senha e confirmação não conferem.");
    if (nw.length < 6) return alert("A nova senha deve ter ao menos 6 caracteres.");
    setCur(""); setNw(""); setConf("");
    alert("Senha alterada com sucesso!");
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Foto de perfil</h2>
        <p className="text-sm text-muted-foreground mt-1">Clique no avatar para trocar.</p>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center hover:border-primary transition-colors group"
          >
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-12 w-12 text-muted-foreground" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Perfil: {user.role === "owner" ? "Proprietário" : user.role === "tenant" ? "Inquilino" : "Admin"}</p>
          </div>
          <input ref={fileRef} onChange={onPick} type="file" accept="image/*" className="hidden" />
        </div>
      </div>

      <form onSubmit={save} className="rounded-xl border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Segurança</h2>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Senha atual</span>
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nova senha</span>
          <input type="password" value={nw} onChange={(e) => setNw(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Confirmar nova senha</span>
          <input type="password" value={conf} onChange={(e) => setConf(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Salvar
        </button>
      </form>
    </div>
  );
}
