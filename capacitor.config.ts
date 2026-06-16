import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.cantopronto",
  appName: "Canto Pronto",
  webDir: "dist",
  // Modo hot-reload: app nativo carrega direto da URL publicada.
  // Após o primeiro publish, troque pela URL real (ex.: https://canto-pronto.lovable.app).
  server: {
    url: "https://project-mirror-helper.lovable.app",
    cleartext: true,
  },
};

export default config;
