import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { SALVADOR_NEIGHBORHOODS } from "@/lib/neighborhoods";
import {
  createProperty,
  deleteProperty as deletePropertyApi,
  listMyProperties,
  type PropertyRow,
} from "@/lib/properties.api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wallet,
  FileText,
  UserCircle,
  Download,
  CheckCircle2,
  Clock,
  Camera,
  KeyRound,
  Home,
  PlusCircle,
  ImagePlus,
  Trash2,
  X,
  Pencil,
} from "lucide-react";

type Section = "financeiro" | "contratos" | "perfil" | "imoveis";

type Invoice = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "pago" | "pendente";
};

const OWNER_INVOICES: Invoice[] = [
  { id: "r1", description: "Recebimento — Apto Barra (Maio)", amount: 2500, dueDate: "05/05/2026", status: "pago" },
  {
    id: "r2",
    description: "Recebimento — Estúdio Rio Vermelho (Maio)",
    amount: 1800,
    dueDate: "05/05/2026",
    status: "pago",
  },
  {
    id: "r3",
    description: "Recebimento — Apto Barra (Junho)",
    amount: 2500,
    dueDate: "05/06/2026",
    status: "pendente",
  },
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
    ...(role === "owner" ? [{ key: "imoveis" as Section, label: "Meus Imóveis", icon: Home }] : []),
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
          {section === "imoveis" && role === "owner" && <MeusImoveis />}
          {section === "perfil" && <Perfil />}
        </section>
      </div>
    </main>
  );
}

const BUCKET = "property-images";
const FALLBACK_IMG = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80";

async function uploadImage(file: File): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Usuário não autenticado.");
  const uid = userData.user.id;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) {
    console.warn("[upload] falhou no Storage, usando fallback local:", error.message);
    throw error;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

async function uploadWithFallback(file: File): Promise<string> {
  try {
    return await uploadImage(file);
  } catch {
    // Fallback: keep image locally as a data URL so the UI keeps working offline / without storage
    return await fileToDataUrl(file);
  }
}

function MeusImoveis() {
  const queryClient = useQueryClient();
  const { updateProperty } = useStore();
  const { data: mine = [] } = useQuery({
    queryKey: ["properties", "mine"],
    queryFn: listMyProperties,
  });
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(SALVADOR_NEIGHBORHOODS[0]);
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("1");
  const [area, setArea] = useState("50");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<PropertyRow | null>(null);

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        urls.push(await uploadWithFallback(f));
      }
      setImages((arr) => [...arr, ...urls]);
      toast.success(`${urls.length} foto(s) adicionada(s).`);
    } catch (e) {
      toast.error("Falha ao enviar imagens.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImages((arr) => arr.filter((_, i) => i !== idx));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceN = Number(price);
    if (!title.trim() || !priceN || !neighborhood) {
      return toast.error("Preencha título, valor e bairro.");
    }
    setSubmitting(true);
    try {
      await createProperty({
        title: title.trim(),
        address: `${neighborhood}, Salvador/BA`,
        neighborhood,
        price: priceN,
        deposit: priceN,
        area: Number(area) || 50,
        bedrooms: Number(bedrooms) || 1,
        bathrooms: Number(bathrooms) || 1,
        image: images[0] || FALLBACK_IMG,
        images,
        amenities: [],
        description: description.trim() || "Imóvel em Salvador/BA.",
        status: "published",
        certification: "pendente",
        score: 0,
      });
      setTitle("");
      setPrice("");
      setNeighborhood(SALVADOR_NEIGHBORHOODS[0]);
      setBedrooms("2");
      setBathrooms("1");
      setArea("50");
      setImages([]);
      setDescription("");
      await queryClient.invalidateQueries({ queryKey: ["properties", "mine"] });
      toast.success(`Imóvel publicado em ${neighborhood}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao publicar imóvel.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Cadastrar Novo Imóvel</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Título do Imóvel</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Apto 2 quartos em Pituba"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Valor do Aluguel (R$)</span>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="2500"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Bairro (Salvador/BA)</span>
            <select
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {SALVADOR_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Quartos</span>
            <input
              type="number"
              min={0}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Banheiros</span>
            <input
              type="number"
              min={0}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Área (m²)</span>
            <input
              type="number"
              min={0}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Descrição (opcional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        {/* Image uploader */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Fotos do imóvel</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-md border bg-muted group">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-90 hover:opacity-100"
                  aria-label="Remover foto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" />
              {uploading ? "Enviando…" : "Adicionar"}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <p className="text-xs text-muted-foreground">
            As fotos ficam públicas no Supabase Storage (bucket “{BUCKET}”).
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Publicando…" : "Publicar Imóvel"}
        </button>
      </form>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-3">
          <h2 className="font-semibold">Imóveis publicados ({mine.length})</h2>
        </div>
        {mine.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Você ainda não cadastrou imóveis.</p>
        ) : (
          <ul className="divide-y">
            {mine.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <img src={p.image} alt="" className="h-12 w-16 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.neighborhood} · {p.bedrooms}q · {p.area}m² · {p.images?.length ?? 0} foto(s)
                  </p>
                </div>
                <span className="text-sm font-semibold">R$ {p.price.toLocaleString("pt-BR")}</span>
                <button
                  onClick={() => setEditing(p)}
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar fotos
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Excluir este imóvel?")) return;
                    try {
                      await deletePropertyApi(p.id);
                      await queryClient.invalidateQueries({ queryKey: ["properties", "mine"] });
                      toast.success("Imóvel excluído.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Falha ao excluir imóvel.");
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-md border px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <EditPhotosModal
          property={editing}
          onClose={() => setEditing(null)}
          onSave={(imgs) => {
            updateProperty(editing.id, {
              images: imgs,
              image: imgs[0] || editing.image || FALLBACK_IMG,
            });
            setEditing(null);
            toast.success("Fotos atualizadas.");
          }}
        />
      )}
    </div>
  );
}

function EditPhotosModal({
  property,
  onClose,
  onSave,
}: {
  property: Pick<PropertyRow, "id" | "title" | "image" | "images">;
  onClose: () => void;
  onSave: (images: string[]) => void;
}) {
  const [imgs, setImgs] = useState<string[]>(
    property.images?.length ? property.images : property.image ? [property.image] : [],
  );
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        urls.push(await uploadWithFallback(f));
      }
      setImgs((a) => [...a, ...urls]);
    } catch {
      toast.error("Falha ao enviar imagens.");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Editar fotos — {property.title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="rounded-md p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {imgs.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImgs((a) => a.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
            {uploading ? "Enviando…" : "Adicionar"}
          </button>
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-3 py-2 text-sm hover:bg-secondary">
            Cancelar
          </button>
          <button
            onClick={() => onSave(imgs)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
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
    setCur("");
    setNw("");
    setConf("");
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
            <p className="text-xs text-muted-foreground mt-1">
              Perfil: {user.role === "owner" ? "Proprietário" : user.role === "tenant" ? "Inquilino" : "Admin"}
            </p>
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
          <input
            type="password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nova senha</span>
          <input
            type="password"
            value={nw}
            onChange={(e) => setNw(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Confirmar nova senha</span>
          <input
            type="password"
            value={conf}
            onChange={(e) => setConf(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
