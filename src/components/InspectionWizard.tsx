import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_INSPECTION_ITEMS,
  getInspection,
  getInspectionPhotoUrl,
  signInspection,
  uploadInspectionPhoto,
  upsertInspection,
  type InspectionItem,
  type InspectionType,
} from "@/lib/inspections.api";
import { Camera, CheckCircle2, AlertTriangle, XCircle, Loader2, PenLine } from "lucide-react";

const STATUS_LABEL = { ok: "OK", atencao: "Atenção", avaria: "Avaria" } as const;

export function InspectionWizard({
  proposalId,
  type,
  role,
  readOnly,
}: {
  proposalId: string;
  type: InspectionType;
  role: "tenant" | "owner";
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const { data: insp, isLoading } = useQuery({
    queryKey: ["inspection", proposalId, type],
    queryFn: () => getInspection(proposalId, type),
  });

  const [items, setItems] = useState<InspectionItem[]>(DEFAULT_INSPECTION_ITEMS);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (insp) {
      const stored = (insp.items as unknown as InspectionItem[]) ?? [];
      if (stored.length) setItems(stored);
      setPhotos(insp.photos ?? []);
    }
  }, [insp]);

  const save = useMutation({
    mutationFn: () => upsertInspection({ proposalId, type, items, photos }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection", proposalId, type] }),
  });

  const sign = useMutation({
    mutationFn: async () => {
      const saved = await upsertInspection({ proposalId, type, items, photos });
      return signInspection(saved.id, role);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection", proposalId, type] }),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => uploadInspectionPhoto(proposalId, file),
    onSuccess: (path) => setPhotos((arr) => [...arr, path]),
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando vistoria...</div>;
  }

  const tenantSigned = !!insp?.signed_by_tenant_at;
  const ownerSigned = !!insp?.signed_by_owner_at;
  const mySign = role === "tenant" ? tenantSigned : ownerSigned;
  const disabled = readOnly || mySign;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold">Itens vistoriados</h3>
        <div className="mt-3 space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground">{it.room} · </span>{it.label}
                </p>
                <div className="flex gap-1">
                  {(["ok", "atencao", "avaria"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={disabled}
                      onClick={() => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, status: s } : x))}
                      className={`rounded-md border px-2 py-1 text-xs font-medium ${
                        it.status === s
                          ? s === "ok" ? "border-success bg-success/10 text-success"
                            : s === "atencao" ? "border-warning bg-warning/10 text-warning-foreground"
                            : "border-destructive bg-destructive/10 text-destructive"
                          : "hover:bg-secondary"
                      } disabled:opacity-60`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              {it.status !== "ok" && (
                <input
                  value={it.note ?? ""}
                  disabled={disabled}
                  onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, note: e.target.value } : x))}
                  placeholder="Descreva a observação..."
                  className="mt-2 w-full rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-60"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4" /> Fotos</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => <PhotoThumb key={p} path={p} />)}
          {!disabled && (
            <label className="flex h-20 cursor-pointer items-center justify-center rounded-md border-2 border-dashed text-xs text-muted-foreground hover:bg-secondary">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }}
              />
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>+ foto</span>}
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!disabled && (
          <>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              Salvar rascunho
            </button>
            <button
              onClick={() => sign.mutate()}
              disabled={sign.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <PenLine className="h-4 w-4" /> Assinar como {role === "tenant" ? "inquilino" : "proprietário"}
            </button>
          </>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          <span className={`inline-flex items-center gap-1 mr-3 ${tenantSigned ? "text-success" : ""}`}>
            {tenantSigned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} Inquilino
          </span>
          <span className={`inline-flex items-center gap-1 ${ownerSigned ? "text-success" : ""}`}>
            {ownerSigned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} Proprietário
          </span>
        </div>
      </div>

      {items.some((i) => i.status === "avaria") && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="inline h-4 w-4 mr-1" /> Há itens marcados como avaria. Considere abrir uma disputa após assinar.
        </div>
      )}
    </div>
  );
}

function PhotoThumb({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["inspection-photo", path],
    queryFn: () => getInspectionPhotoUrl(path),
    staleTime: 1000 * 60 * 30,
  });
  if (!data) return <div className="h-20 rounded-md bg-muted animate-pulse" />;
  return <img src={data} alt="" className="h-20 w-full rounded-md object-cover" />;
}
