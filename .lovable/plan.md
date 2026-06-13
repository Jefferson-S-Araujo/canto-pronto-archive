
# App Mobile Nativo (Capacitor) + Página /qr

## 1. Publicar primeiro

Pra o QR apontar pra URL publicada estável, o projeto precisa estar publicado. Sequência:

1. Eu adiciono a página `/qr` + setup Capacitor.
2. Você clica em **Publish** no botão verde no topo direito.
3. A URL fica `https://<slug>.lovable.app` — uso ela como destino fixo do QR e como `server.url` do Capacitor (modo hot-reload em dev nativo).

## 2. Página `/qr` (rota pública)

Arquivo: `src/routes/qr.tsx`

- Renderiza um cartão centralizado com:
  - Logo / título "Canto Pronto"
  - QR code grande apontando pra URL publicada
  - URL em texto abaixo (selecionável)
  - Botão "Copiar link"
  - Instruções curtas: "Aponte a câmera do celular pro código"
- QR gerado client-side com **`qrcode.react`** (lib pequena, sem dependência server).
- URL alvo lida de uma constante única `PUBLISHED_URL` em `src/lib/config.ts` pra eu trocar depois quando você me passar o slug final.
- `head()` com title/description próprios pra SEO.
- Link "Abrir no celular" também no `AppNav` (header).

## 3. Capacitor (iOS/Android)

### Setup no projeto Lovable

- Instalar `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`.
- Criar `capacitor.config.ts` na raiz:
  - `appId: "app.lovable.cantopronto"` (você pode trocar depois)
  - `appName: "Canto Pronto"`
  - `webDir: "dist"`
  - `server.url: "https://<slug>.lovable.app"` + `cleartext: false` → o app nativo carrega direto da URL publicada, sem precisar rebuildar a cada deploy.
- Atualizar `package.json` com scripts:
  - `cap:add:ios`, `cap:add:android`, `cap:sync`, `cap:open:ios`, `cap:open:android`.

### O que VOCÊ executa localmente (não dá pra rodar daqui)

Capacitor exige build nativo com Xcode (Mac) ou Android Studio. O Lovable só roda no Worker.

Passo a passo que vou deixar em `MOBILE.md`:

```text
1. git pull (puxa o código do GitHub)
2. npm install
3. npm run build
4. npx cap add ios       (só primeira vez, precisa Mac)
   npx cap add android   (só primeira vez)
5. npx cap sync
6. npx cap open ios      → roda no Xcode → simulador ou iPhone físico
   npx cap open android  → roda no Android Studio → emulador ou Android físico
```

Pra publicar nas lojas: Apple Developer ($99/ano) + Google Play ($25 único). Doc oficial linkada no `MOBILE.md`.

### Alternativa rápida sem Mac/Android Studio

Menciono no `MOBILE.md`: usar **Ionic Appflow** ou **Voltbuilder** (build na nuvem, paga) se você não tiver as ferramentas locais.

## 4. Ajustes pra rodar dentro do WebView

- Detectar `Capacitor` em runtime (`window.Capacitor?.isNativePlatform()`) e:
  - Esconder o botão "Abrir no celular" / página `/qr` (não faz sentido dentro do app).
  - Ajustar safe-area do iOS (`env(safe-area-inset-top)`) no header — adiciono no `styles.css`.
- Auth do Supabase: o redirect do Google OAuth não funciona dentro de WebView nativo sem deep link. **Limitação aceita**: na v1 do app nativo, login só com e-mail/senha (que já está implementado). Google fica desabilitado quando rodando em Capacitor.

## 5. Fora do escopo desta entrega

- Publicação nas lojas (App Store / Play) — você precisa das contas de desenvolvedor.
- Push notifications nativas.
- Câmera nativa (hoje upload de fotos da vistoria usa `<input type="file">`, que já abre a câmera no celular).
- Splash screen e ícones customizados (Capacitor cria defaults; trocar depois com `@capacitor/assets`).

## 6. Arquivos que vou criar/editar

**Criar:**
- `src/routes/qr.tsx`
- `src/lib/config.ts` (constante `PUBLISHED_URL`)
- `capacitor.config.ts`
- `MOBILE.md` (instruções pra você rodar localmente)

**Editar:**
- `package.json` (deps + scripts cap)
- `src/components/AppNav.tsx` (link "Abrir no celular")
- `src/styles.css` (safe-area iOS)

## 7. Validação

- Visito `/qr` no preview → QR aparece, escaneio com celular → abre URL publicada.
- Após você rodar `npx cap sync` + abrir no simulador, app carrega a versão publicada dentro do WebView.

## 8. Pergunta aberta

A `PUBLISHED_URL` no `src/lib/config.ts` começa apontando pra um placeholder. **Depois que você publicar pela primeira vez**, me manda a URL real (ex.: `https://canto-pronto.lovable.app`) que eu atualizo o arquivo. Ou, se preferir, eu deixo a página `/qr` lendo `window.location.origin` em runtime — funciona automaticamente em qualquer ambiente, mas o QR muda dependendo de onde o usuário acessa. Qual prefere?
