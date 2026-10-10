# RUdown on your phone

RUdown is an installable web app (PWA), using the same hosted backend as the website. It has home-screen icons, standalone display, five mobile navigation tabs, safe-area spacing for phone screens, and an offline reconnect page. No App Store or Play Store package is included.

## Install

Open **https://rudown.rayaanzahid06.chatgpt.site** on your phone. Sign in to the private site if prompted. Tap **Install app** for instructions.

- **iPhone/iPad:** In Safari, use the Share menu → Add to Home Screen. Leave **Open as Web App** enabled if offered, then tap Add. [Apple instructions](https://support.apple.com/guide/iphone/iphea86e5236/ios).
- **Android:** In Chrome, use RUdown's install prompt if offered, or Chrome's menu → Add to Home screen / Install app. Labels and install availability vary by browser. [Installation overview](https://web.dev/learn/pwa/installation).

Launch the new **RUdown** icon. Install **before** creating your group: some browsers/devices use separate storage for installed apps. This prototype keeps your membership token on the device and has no cross-device account recovery. If an existing group does not appear in the installed app, keep using the original browser for that membership; don't clear its storage.

## Features and limits

- Discover, Our plan, Ideas, Crew, and Wallet are reachable from the bottom bar on phone-sized screens.
- Shared plans, location searches, maps, and Google Calendar require internet. The service worker returns a reconnect page when a main-page navigation fails. It does not cache private data, authentication pages, API responses or approval requests. An already-open app shows an offline notice and rejects shared planning changes while offline; nothing is queued.
- The site is still private. Installing does not bypass hosting permissions; friends need site access in addition to a group invitation.
- Automatic Calendar sync still requires the [Google OAuth setup](CALENDAR-SETUP.md). Connect from the browser/app where your group membership exists.
- Injected wallet extensions may not be available in phone browsers or installed apps. Solana wallet connection remains dependent on a compatible wallet browser; mobile wallet adapters and escrow are not added by this upgrade.
- No push notifications, native background location or app-store distribution is included.

## Validation

Run `node scripts/test-mobile.mjs` for manifest/icon and service-worker behavior checks. Run `node node_modules/typescript/bin/tsc --noEmit` and the normal build. Browser QA covers responsive navigation, install help and manifest delivery. Final iPhone/Android installation should be checked on physical phones; desktop viewport emulation cannot verify an operating-system install.

Icons are rendered from the original vector mark in `scripts/generate-app-icons.mjs`. Run it with the installed `sharp` package if changing the artwork. Manifest: `public/manifest.webmanifest`. Offline worker: `public/sw.js`.
