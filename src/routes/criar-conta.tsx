import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, FileText, ArrowLeft, ShieldCheck, Upload, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";

const TOTAL_STEPS = 4;

type CriarContaSearch = {
  step?: number;
  userType?: "tenant" | "owner";
};

export const Route = createFileRoute("/criar-conta")({
  validateSearch: (search: Record<string, unknown>): CriarContaSearch => {
    const rawStep = search.step;
    const step =
      typeof rawStep === "number"
        ? rawStep
        : typeof rawStep === "string"
          ? parseInt(rawStep, 10) || 1
          : 1;
    return {
      step: step >= 1 && step <= TOTAL_STEPS ? step : 1,
      userType:
        search.userType === "tenant" || search.userType === "owner"
          ? search.userType
          : undefined,
    };
  },
  component: CriarConta,
});

function CriarConta() {
  const navigate = useNavigate();
  const { login } = useStore();
  const { step = 1, userType: queryUserType } = Route.useSearch();

  const [userType, setUserType] = useState<"tenant" | "owner" | null>(
    queryUserType || null
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Antifraud state (step 3)
  const [docName, setDocName] = useState("");
  const [hasDoc, setHasDoc] = useState(false);
  const [hasSelfie, setHasSelfie] = useState(false);
  const [fraudOk, setFraudOk] = useState(false);

  const handleContinueStep1 = () => {
    if (!userType) return;
    navigate({
      to: "/criar-conta",
      search: { step: 2, userType },
    });
  };

  const handleContinueStep2 = () => {
    setError("");

    if (!name.trim()) {
      setError("Por favor, insira seu nome");
      return;
    }

    if (!email.trim()) {
      setError("Por favor, insira seu e-mail");
      return;
    }

    if (!password || password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem");
      return;
    }

    navigate({
      to: "/criar-conta",
      search: { step: 3, userType },
    });
  };

  const handleValidateAntifraud = () => {
    setError("");
    if (!docName.trim()) {
      setError("Digite o nome impresso no documento.");
      return;
    }
    if (!hasDoc || !hasSelfie) {
      setError("Envie o RG/CNH e a selfie para validação.");
      return;
    }
    const match =
      docName.trim().toLowerCase() === name.trim().toLowerCase() &&
      name.trim().length > 2;
    if (!match) {
      setError(
        "O nome do documento não confere com o nome cadastrado. Verifique e tente novamente."
      );
      setFraudOk(false);
      return;
    }
    setFraudOk(true);
    navigate({ to: "/criar-conta", search: { step: 4, userType } });
  };

  const handleContinueStep4 = async () => {
    if (!userType) return;
    if (!fraudOk) {
      setError("Conclua a validação do Antifraude antes de finalizar.");
      navigate({ to: "/criar-conta", search: { step: 3, userType } });
      return;
    }
    setError("");
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      login({ name, email, role: userType });
      navigate({ to: userType === "owner" ? "/proprietario" : "/inquilino" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };


  const handleBack = () => {
    if (step === 1) {
      navigate({ to: "/entrar" });
    } else {
      navigate({
        to: "/criar-conta",
        search: { step: step - 1, userType },
      });
    }
  };

  const handleLoginRedirect = () => {
    navigate({ to: "/entrar" });
  };

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* Progress Bar */}
        <div className="mb-6 space-y-2">
          <div className="flex gap-2 h-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs font-medium text-muted-foreground">
            Etapa {step} de {TOTAL_STEPS}
          </p>
        </div>

        {/* STEP 1: User Type Selection */}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Criar Conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha o tipo de cadastro
            </p>

            <div className="mt-8 space-y-3">
              {/* Tenant Option */}
              <button
                onClick={() => setUserType("tenant")}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  userType === "tenant"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-lg bg-green-100 p-2">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Sou Inquilino</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Quero encontrar imóveis mobiliados para alugar
                    </p>
                  </div>
                  {userType === "tenant" && (
                    <div className="mt-1 h-5 w-5 rounded-full border-2 border-primary bg-primary" />
                  )}
                </div>
              </button>

              {/* Owner Option */}
              <button
                onClick={() => setUserType("owner")}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  userType === "owner"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-lg bg-blue-100 p-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Sou Proprietário</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Quero anunciar meu imóvel mobiliado
                    </p>
                  </div>
                  {userType === "owner" && (
                    <div className="mt-1 h-5 w-5 rounded-full border-2 border-primary bg-primary" />
                  )}
                </div>
              </button>
            </div>

            <button
              onClick={handleContinueStep1}
              disabled={!userType}
              className="mt-8 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Continuar
            </button>
          </>
        )}

        {/* STEP 2: Personal Information */}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Seus Dados</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Preencha suas informações de cadastro
            </p>

            <form className="mt-6 space-y-4">
              <Field
                label="Nome Completo"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Field
                label="E-mail"
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Field
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Field
                label="Confirmar Senha"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="button"
                onClick={handleContinueStep2}
                className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
              >
                Continuar
              </button>
            </form>
          </>
        )}

        {/* STEP 3: Antifraud */}
        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              Cadastro & Antifraude
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Validação visual obrigatória antes de finalizar
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                <p className="text-muted-foreground">Nome cadastrado</p>
                <p className="mt-0.5 font-semibold">{name || "—"}</p>
              </div>

              <Field
                label="Nome impresso no documento (simula OCR)"
                placeholder="Ex: Maria Silva"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FileBox
                  label="Foto do RG/CNH"
                  checked={hasDoc}
                  onCheck={() => setHasDoc(true)}
                />
                <FileBox
                  label="Selfie"
                  checked={hasSelfie}
                  onCheck={() => setHasSelfie(true)}
                />
              </div>

              {error && (
                <p className="flex items-start gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleValidateAntifraud}
                disabled={!docName || !hasDoc || !hasSelfie}
                className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50"
              >
                Validar e Continuar
              </button>
            </div>
          </>
        )}

        {/* STEP 4: Review */}
        {step === 4 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              Revisar Informações
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifique seus dados antes de criar a conta
            </p>

            <div className="mt-6 space-y-4 rounded-lg bg-muted/40 p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tipo</p>
                <p className="mt-1 text-sm font-semibold">
                  {userType === "tenant" ? "Sou Inquilino" : "Sou Proprietário"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nome</p>
                <p className="mt-1 text-sm font-semibold">{name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">E-mail</p>
                <p className="mt-1 text-sm font-semibold">{email}</p>
              </div>
              <div className="flex items-center gap-2 text-success">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-medium">
                  Antifraude validado
                </span>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            )}

            <button
              onClick={handleContinueStep4}
              disabled={loading}
              className="mt-6 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Criando conta…" : "Criar Conta"}
            </button>
          </>
        )}

        {/* Login Link */}
        <button
          onClick={handleLoginRedirect}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Já tem uma conta? Entrar
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function FileBox({
  label,
  checked,
  onCheck,
}: {
  label: string;
  checked: boolean;
  onCheck: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCheck}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 transition ${
        checked
          ? "border-success bg-success/5 text-success"
          : "border-border hover:bg-secondary"
      }`}
    >
      <Upload className="h-5 w-5" />
      <span className="text-xs font-medium">
        {checked ? `${label} ✓` : label}
      </span>
    </button>
  );
}
