# RUdown

**Find a plan your whole group can afford.** A React + TypeScript + Tailwind hackathon app for agreeing on a group hangout, day trip, or overnight getaway.

Live app: https://rudown.rayaanzahid06.chatgpt.site

The landing page contains the actual interactive planner. Change an individual budget, origin, transport choice or optional allowance to recalculate costs and recommendations. [Demo walkthrough, price sources, algorithm and limitations](docs/LOCAL-DEMO.md).

**Install on iPhone or Android:** open the hosted site on your phone and tap **Install app**. See [mobile installation and limits](docs/MOBILE.md). This is an installable web app with home-screen icons and mobile navigation.

## Run on this Windows workspace

Double-click `../Start-RUdown.cmd`, or run it from a terminal. Open the local URL printed by the server (normally `http://127.0.0.1:5173`). A portable Node.js runtime lives in `../.tools/`; no system install is required. Stop the server with Ctrl+C.

The local database has been initialized. **Explore a demo** opens an editable sample crew without creating a database record. **Create group** and **Join a group** use the real local D1 database.

## Fresh checkout setup

Requires Node.js 22.13+ (22.16+ recommended), npm, and Git for publication.

```sh
npm ci
npm run db:generate  # only after schema changes; initial migration is already committed
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nebulous_komodo.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_dry_captain_stacy.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_unusual_red_wolf.sql
npm run dev
```

Apply each local migration once and in order. `npm start` runs the built Worker locally. The app uses Vinext/Vite, React, Tailwind, and Cloudflare D1. The Sites build integration remains in `vite.config.ts`.

## Configuration

No API credentials are required for the seeded planning flow or demo map.

| Setting | Purpose |
| --- | --- |
| `DB` | Required D1 binding declared in `.openai/hosting.json`; local preview emulates it and Sites provisions it on deployment. |
| `GEOCODER_URL` | Optional server runtime variable. Defaults to `https://photon.komoot.io/api/`. Must point to a compatible Photon API when changed. |
| Solana RPC | The wallet screen reads `https://api.devnet.solana.com`; no private key is required or stored. |

Keep future credentials in server runtime variables, never frontend code. There is no Google Maps API key in this project. Map rendering uses Leaflet 1.9.4 and OpenStreetMap tiles; Google Maps links open directions separately.

## Implemented

- Responsive landing page, dashboard, activity details, plan editor, crew profiles, voting, and wallet screen.
- Database-backed groups with invite codes, deadlines, display names, and six-second update polling.
- Participant-specific bearer credentials stored on the device; only SHA-256 credential hashes are stored server-side. API responses exclude hashes.
- Personal budget, approximate location, travel limits, categories, time-of-day availability, dietary/accessibility needs, and ride preferences.
- Published-price Rutgers Cinema, Zimmerli, Geology Museum and Rutgers Gardens plans, plus broader estimated itineraries and local templates generated from saved group locations. Published rates and user allowances are labeled separately.
- Live ZIP-code / city / place search via Photon, cached for 24 hours; interactive map with participant and activity pins.
- Deterministic scoring using every participant's estimated travel burden, budget, availability, category preferences, and demo capacity. Unverified requirements are visible.
- “What if” explanations identify the individual budget increase or travel-limit increase needed. Only the participant can change their own limits.
- Integer-cent expense splitting, group versus per-person pricing, participant subsets, custom expense rows, edit/delete, and budget flags. Remainder cents are distributed in stable participant-ID order.
- One editable vote per person per suggestion; majority-supported ideas appear as crew favorites. Votes never set approvals.
- Exact-share, version-specific approvals and revocation. Changing preferences, plans, expenses, or participants clears approvals. A new join resets the selected plan so the organizer can recalculate for the changed crew.
- Nearby carpool suggestions with estimated straight-line detours, two-party consent, seat-capacity enforcement, and prevention of a rider accepting multiple confirmed rides.
- Injected Solana wallet connection (e.g. Phantom), real confirmed Devnet balance lookup, Explorer link, and faucet link.
- Server-side membership/organizer checks, validation, optimistic concurrency to reject stale writes, and planning-deadline enforcement.
- Organizer-set outing dates, time-zone-aware display, and one-click Google Calendar export. Opt-in server-side calendar sync is implemented but requires Google OAuth configuration; see [calendar setup](docs/CALENDAR-SETUP.md).

## Solana: exact status

The repository includes an **undeployed escrow source prototype** in `solana/`. Deposits, payment releases, withdrawals, and refunds are disabled in the app. No transaction is constructed or signed. A planning approval is stored in D1; it is not an on-chain spending authorization. The wallet screen says this explicitly. Stripe card checkout is a separate test flow; see [card setup](docs/CARD-PAYMENTS.md).

To try the implemented wallet flow:

1. Open the app in a browser with a compatible injected Solana wallet.
2. Open **Group wallet** and approve the connection in the wallet.
3. The screen reads the connected address's **Devnet** balance regardless of the wallet's currently selected network.
4. Optionally obtain test SOL from `https://faucet.solana.com/`. The app does not automatically request funds.

Test SOL has no real monetary value. Planning prices stay in USD; no exchange rate or demo conversion is currently applied. Funds already released to a recipient could not be automatically recovered by a future escrow. No business is paid and no venue is booked.

## Verification

```sh
node scripts/test-domain.mjs
node scripts/test-calendar.mjs
node scripts/test-mobile.mjs
node scripts/test-api.mjs http://127.0.0.1:5173
npx tsc --noEmit
npm run build
```

The domain suite covers cent conservation, expense subsets, per-person charges, permissions, self-only preference changes, exact approvals, invalidation, stale versions, budget/travel limits, incomplete preferences, voting, invalid financial input, carpool consent, and deadlines.

The API suite creates **QA-only local groups** and verifies the database-backed two-participant flow, denied unauthenticated access, organizer-only editing, optimistic concurrency, approvals, expense invalidation, and credential-hash redaction. It does not print access tokens.

See [docs/DEMO.md](docs/DEMO.md) for a three-minute presentation script.

## Limits and next steps

- **Escrow and refunds:** Build, test, and deploy an Anchor program before enabling deposits. It needs per-session/per-wallet accounting, version-bound approvals, release caps, cutoff-aware withdrawals, unsuccessful-deadline refunds, unused-balance recovery, and tests against unauthorized or duplicate withdrawals.
- **Demo data:** All activity listings, prices, capacities, itineraries, and photos are illustrative. Venue opening hours, live inventory, reservations, dietary suitability, and accessibility are unverified. Live map search is not a live activity recommendation catalog.
- **Travel:** Distances, pickup distances, and detours use the Haversine formula. No road routing, traffic estimates, or travel times are claimed. Integrate a routing provider for production.
- **Scheduling:** Availability matching uses morning/afternoon/evening. The organizer can set actual outing dates separately. Calendar sync is one-way; reading free/busy availability is not implemented. Live OAuth validation is pending configuration; mocked integration tests cover sync and consent handling.
- **Identity:** The prototype uses invite codes and device-held access tokens. There is no account recovery, cross-device identity transfer, member removal, or organizer transfer. Do not clear browser storage if you need to retain access. The most recently joined group is restored on reload.
- **Scale:** Groups support up to 12 people, 50 expenses, and 50 suggestions. Add service-level rate limiting, invite expiry, account recovery, and database retention rules before broad public use.
- **External services:** Photon is a best-effort public demo service for reasonable use. Searches are explicit (not per-keystroke), throttled in the UI, and cached. For sustained usage, configure a private/paid provider. Respect [Photon's usage guidance](https://github.com/komoot/photon#demo-server) and [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/). Searches may be unavailable if their service is down. Leaflet loads from unpkg, photos from Unsplash, and map tiles require connectivity.
- **Hosting:** The Sites preview is private by default. Group invite codes do not bypass hosting access controls. Other participants need access to the deployment; public hackathon sharing is a separate hosting setting. Local groups and hosted groups use separate databases.

## Key source files

- `app/page.tsx`: client session management and main screens.
- `app/components/Map.tsx`: Leaflet integration and location-search UI.
- `app/components/Plan.tsx`: costs, approvals, and carpools.
- `lib/planning.ts`: types, seeded catalog, distance scoring, and expense calculations.
- `lib/actions.ts`: validated planning mutations shared by server and sample demo.
- `app/api/groups/route.ts`: persistent group API, credentials, and concurrency protection.
- `app/api/search/route.ts`: server-side Photon lookup and cache.
- `db/schema.ts` and `drizzle/`: D1 schema and migrations.

This is a hackathon prototype, not a payment or booking service.
