import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ShieldCheck, Upload, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/cadastrar")({ component: Cadastrar });

function Cadastrar() {
  const { user, submitDocs } = useStore();
  const [name, setName] = useState("");
  const [docName, setDocName] = useState("");
  const [hasSelfie, setSelfie] = useState(false);
  const [hasDoc, setDoc] = useState(false);
  const [result, setResult] = useState<"match" | "mismatch" | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasDoc || !hasSelfie) return;
    setResult(submitDocs(name, docName));
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Cadastro & Antifraude</h1>
      <p className="text-sm text-muted-foreground">Onboarding seguro com validação visual interna.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <Field label="Seu nome completo" value={name} onChange={setName} placeholder="Ex: Maria Silva" />
        <Field label='Nome impresso no documento (simula OCR)' value={docName} onChange={setDocName} placeholder="Ex: Maria Silva" />

        <div className="grid gap-3 sm:grid-cols-2">
          <FileBox label="Foto do RG/CNH" checked={hasDoc} onCheck={() => setDoc(true)} />
          <FileBox label="Selfie" checked={hasSelfie} onCheck={() => setSelfie(true)} />
        </div>

        <button
          type="submit"
          disabled={!name || !docName || !hasDoc || !hasSelfie}
          className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50"
        >
          Enviar para análise
        </button>
      </form>

      {result === "match" && (
        <div className="mt-5 rounded-xl border border-success/30 bg-success/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-success">
            <ShieldCheck className="h-5 w-5" /> Em Análise Visual Interna
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            O OCR validou seu nome. Um administrador irá aprovar seu cadastro em breve.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            (Demo) Aprove você mesmo no <Link to="/admin" className="font-semibold text-primary underline">Painel Admin</Link>.
          </p>
        </div>
      )}

      {result === "mismatch" && (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <AlertCircle className="h-5 w-5" /> Divergência detectada
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            O nome digitado não coincide com o documento. Verifique e tente novamente.
          </p>
        </div>
      )}

      {user.docStatus === "approved" && (
        <div className="mt-5 rounded-xl border border-success/30 bg-success/10 p-4">
          <p className="font-semibold text-success">Cadastro aprovado ✓</p>
          <p className="mt-1 text-sm text-muted-foreground">Bem-vindo(a), {user.name}!</p>
        </div>
      )}
    </main>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function FileBox({ label, checked, onCheck }: { label: string; checked: boolean; onCheck: () => void }) {
  return (
    <button
      type="button"
      onClick={onCheck}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition ${
        checked ? "border-success bg-success/5 text-success" : "border-border hover:bg-secondary"
      }`}
    >
      <Upload className="h-6 w-6" />
      <span className="text-sm font-medium">{checked ? `${label} ✓` : label}</span>
    </button>
  );
}
