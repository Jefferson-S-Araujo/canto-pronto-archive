# Canto Pronto — App Mobile (iOS / Android)

O app web já funciona em qualquer navegador mobile. Para empacotar como app
nativo (iOS / Android) usamos **Capacitor**. O build nativo precisa rodar
**na sua máquina local** — não dá pra rodar dentro do Lovable.

## Pré-requisitos

- **Android**: [Android Studio](https://developer.android.com/studio)
- **iOS**: Mac com [Xcode](https://apps.apple.com/app/xcode/id497799835)
- Node 18+ e npm/bun

## Passo a passo

1. Exporte o projeto pro seu GitHub (botão **GitHub** no topo do Lovable) e clone:

   ```bash
   git clone <seu-repo>
   cd <seu-repo>
   npm install
   ```

2. Build do web:

   ```bash
   npm run build
   ```

3. Adicione a plataforma (só primeira vez):

   ```bash
   npx cap add ios       # precisa de Mac
   npx cap add android
   ```

4. Sincronize (toda vez que mudar código nativo / dependências):

   ```bash
   npx cap sync
   ```

5. Abra na IDE nativa e rode no emulador/dispositivo:

   ```bash
   npx cap open ios       # abre Xcode
   npx cap open android   # abre Android Studio
   ```

## Hot reload da URL publicada

Em `capacitor.config.ts` o campo `server.url` aponta pra URL do projeto
Lovable. Isso faz o app nativo carregar a versão publicada em tempo real —
você publica no Lovable, abre o app, e já está atualizado. Sem rebuild
nativo.

**Depois de publicar pela primeira vez**, atualize `server.url` com a URL
final (ex.: `https://seu-slug.lovable.app`) e rode `npx cap sync` de novo.

## Publicar nas lojas

- **Apple App Store**: precisa conta [Apple Developer](https://developer.apple.com/programs/) (US$ 99/ano).
- **Google Play**: precisa conta [Google Play Console](https://play.google.com/console) (US$ 25 único).

Guia oficial do Capacitor: <https://capacitorjs.com/docs/deployment>.

## Sem Mac nem Android Studio?

Use build na nuvem:
- [Ionic Appflow](https://ionic.io/appflow)
- [Voltbuilder](https://voltbuilder.com/)

## Limitações conhecidas (v1)

- Login com Google não funciona dentro do WebView nativo sem deep links
  configurados. Use **email + senha** no app. Login Google segue funcionando
  no navegador.
- Sem push notifications nativas (planejado pra v2).
- Splash screen e ícone usam defaults do Capacitor. Customize com
  [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets).
