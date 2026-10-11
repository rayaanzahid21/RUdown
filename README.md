# RUdown

Group outing planning with individual budgets, real venue discovery, explicit approvals and test contributions.

Live site: https://rudown.rayaanzahid06.chatgpt.site (public). GitHub: https://github.com/rayaanzahid21/RUdown

## Run a fresh checkout

Install Node.js 22.16+ and npm, then run:

```sh
npm ci
npm run build
npm run db:setup
npm run dev
```

Open the URL printed by the server. No script outside this repository is required. The sample planner works without API credentials. Shared local groups need the local D1 setup above. Local and hosted databases are separate. The database setup script supports the current create-table migrations idempotently; review it before introducing destructive migrations.

## What works and what it means

| Feature | Behavior and limits |
| --- | --- |
| Planning | Integer-cent shares, different budgets, versioned approvals, conflicts, backup suggestions and recalculation. Approval is consent, not payment. |
| Venues | Google Places returns named venues, addresses, ratings/counts when available, photos and opening hours. Search replaces the cards and map. |
| Prices | Four Rutgers-area plans have linked published admission sources. Other amounts are editable allowances, not current menus, room quotes or bookings. |
| Hours | Dated Google hours are compared with the full outing window within the available seven-day horizon. Missing data and later dates remain unknown. No reservations or availability guarantees. |
| Travel | Each member can enter venue-specific transport mode, one-way minutes, maximum minutes and round-trip fare in Our plan. These affect costs and time-limit checks. Other venues retain unknown travel time; straight-line distance is only a proximity measure. |
| Groups | Organizer reset retains members/preferences/receipts; role transfer and leave revoke membership access. Save a private recovery code for another device. Invite codes do not recover an existing identity. |
| Solana | Constructs a transfer + plan memo, asks an injected wallet to sign, submits only to Devnet, and verifies the on-chain sender, recipient, amount, memo and successful result. Separate contribution receipts show version and Explorer links. |
| Cards | Stripe hosted test Checkout; amounts come from saved shares. Receipt status is retrieved from Stripe, never trusted from the return URL. Requires a sandbox secret key. |
| Calendar | Google export and opt-in OAuth sync. Credentials are configured on the hosted site; each member must authorize their own account. Reads no free/busy data. |
| AI | Gemini explains group conflicts. Venue discovery itself uses Google Places and deterministic ranking. |

## Solana, precisely

The featured flow is a **Devnet transfer to an organizer-selected wallet**, not escrow. Each USD cent in the estimated share maps to 1,000 test lamports for demonstration ($1 = 0.0001 test SOL). This is not a market exchange rate or payment for the real outing. Test SOL has no real monetary value; network fees are extra.

All participants approve the current plan before a contribution is prepared. The recipient is part of the versioned plan; changing it clears approvals. A signed transaction can still land after the plan changes; its receipt stays attached to the old version and is never presented as payment for the new version. An earlier paid contribution blocks another contribution until reviewed. No automatic refund, release, venue booking, USD settlement, or on-chain enforcement of D1 approvals is claimed. The Anchor source in solana/ remains an undeployed research prototype and is not used by this transfer flow.

Use a compatible injected Solana wallet supporting connect and signTransaction. Phantom is the primary test target; Trust Wallet provider detection exists but device-specific signing still needs an interactive check. On phones, use the wallet's in-app browser. No private wallet key is requested or stored by RUdown.

## Configuration

Store local values in ignored .env.local; configure hosted values separately as server secrets. Never commit keys.

| Variable | Use |
| --- | --- |
| GOOGLE_PLACES_API_KEY | Places API (New): venues, photos and hours. |
| GEMINI_API_KEY / GEMINI_PLANNING_MODEL | Optional conflict advice. |
| STRIPE_SECRET_KEY | Sandbox sk_test_ key only. Live keys are rejected. |
| GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET | Calendar OAuth credentials. |
| CALENDAR_ENCRYPTION_KEY / CALENDAR_APP_ORIGIN | Encrypted calendar tokens and exact hosted origin. |
| GEOCODER_URL | Optional Photon-compatible geocoder. |

See docs/CALENDAR-SETUP.md, docs/CARD-PAYMENTS.md, docs/LIVE-DISCOVERY.md and docs/DEMO-READINESS.md.

## Validation

```sh
npm run typecheck
npm test
npm run test:readiness
node scripts/test-discovery.mjs
node scripts/test-calendar.mjs
node scripts/test-conflicts.mjs
node scripts/test-nearby-payments.mjs
npm run build
```

Tests cover cent conservation, authorization, invalidation, stale revisions, reset/leave/role transfer, venue identity matching, hours across midnight, route costs/time limits, transaction construction/signing and tampered receipts. See the dated validation report for actual external-provider checks. Mocked tests do not establish a successful user OAuth or hosted card checkout.

## Remaining limits

- Accessibility, dietary suitability, capacities, booking inventory and suggested itineraries require confirmation.
- No automatic transit routing. Enter travel estimates for each venue; inspect older itinerary transport rows to avoid counting the same fare twice.
- Recovery requires saving a private code before losing device storage. Anyone holding that code can act as that member; leaving revokes it. This is not an email/password account system.
- Provider outages, quotas and venue Wi-Fi can affect maps, photos, Gemini, Calendar and payments. The deterministic sample planner and generated venue artwork do not require these services after the app loads. No authenticated data or writes are cached offline.
- The published app is public; possession of an invite allows a new membership. Groups support up to 12 member records. This is a hackathon prototype, not a production payment service.
- AI-assisted implementation: judges should inspect lib/planning.ts, lib/actions.ts, lib/solana-payments.ts and app/api/solana/route.ts. Follow the event's AI and eligibility rules; commit dates have not been rewritten.

Leaflet 1.9.4 is bundled under public/vendor/leaflet with its license, removing the unpkg runtime dependency. Map tiles still need a network connection.
