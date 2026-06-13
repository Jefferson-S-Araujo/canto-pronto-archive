import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Copy, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicAppUrl } from "@/lib/config";

export const Route = createFileRoute("/qr")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Abrir no celular — Canto Pronto" },
      { name: "description", content: "Escaneie o QR code para abrir o Canto Pronto no celular." },
      { property: "og:title", content: "Abrir no celular — Canto Pronto" },
      { property: "og:description", content: "Escaneie o QR code para abrir o Canto Pronto no celular." },
    ],
  }),
  component: QrPage,
});

function QrPage() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(getPublicAppUrl());
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card className="text-center">
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Abra no celular</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Aponte a câmera do seu celular para o código abaixo.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="rounded-xl border bg-white p-4">
              {url ? (
                <QRCodeSVG value={url} size={240} level="M" />
              ) : (
                <div className="h-[240px] w-[240px] animate-pulse rounded bg-muted" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-md bg-muted px-3 py-2 text-xs font-mono break-all">
              {url || "carregando..."}
            </div>
            <Button onClick={copy} variant="outline" size="sm" className="w-full">
              {copied ? (
                <><Check className="mr-2 h-4 w-4" /> Copiado</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" /> Copiar link</>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Funciona em iOS e Android pelo navegador. Para instalar como app nativo, veja{" "}
            <code className="text-foreground">MOBILE.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
