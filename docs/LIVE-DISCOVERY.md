# Live destination search

In Discover plans, enter a ZIP code/town in the map area's search box, then select the matching location. RUdown requests up to 20 popular Google Places within 10 miles and replaces the cards. Category changes search again; overnight trips search hotels. An empty/error result never silently presents old-area cards. Reset search restores curated crew suggestions. Searches also work in the public demo.

This changes the outing destination, not members' saved origins. Ranking uses each member's budget, straight-line travel limit and interests; ratings break equal scores. A user-editable activity allowance supplies planning costs. It is not a venue quote. Each person's transport estimate and optional spending are added. Unknown transport and unverified Rutgers bus access are called out and block approval until corrected.

Live results use a Google Maps embed with selectable venue buttons: selecting a venue updates the map pin. This is a single-venue pin view, not a multi-marker Google Maps JavaScript map. The old OpenStreetMap view is used only for the curated destinations, not Google-derived pins. Each result includes a Google Maps source, rating/count when available, and photos fetched by Place ID.

The organizer may select a live result. The server refreshes the place independently and validates the allowance; client-supplied names/coordinates/prices cannot be substituted. Selection clears approvals. Only the selected Place ID and the user-entered allowance are persisted; Google venue details are freshly loaded for shared group views/calendar requests. Routine unchanged group polls bypass Place Details. A Google outage can temporarily prevent the selected venue from loading/being approved; the saved Place ID and group inputs remain intact.

Limits: 200 public discovery attempts/site/UTC day; photos retain their independent 300-attempt cap. No automatic retries. Search results and provider error messages are not cached in D1 or the service worker. API responses are no-store. `GOOGLE_PLACES_API_KEY` remains server-only. This feature uses Places API (New), not Gemini Maps grounding, and does not require Gemini quota.

Tests: `node scripts/test-discovery.mjs`; existing calendar, conflicts, payment, live planner and domain suites. Live provider checks should confirm two distinct searched areas return distinct venue lists and that a selected venue reloads correctly.

Opening hours: currentOpeningHours and regularOpeningHours are fetched in the same Google Places request as the venue. Cards, details and the selected plan show the provider's weekly text in the venue's local time and open/closed status at the UTC check timestamp. Current (next seven days) hours take precedence; regular hours are labeled as a fallback. Missing hours stay unknown, never closed or 24 hours by assumption. Hours are not persisted and are not used to guarantee future schedule availability. No additional key is required.

Saved catalog suggestions now load hours lazily through /api/venue-hours when visible. Name and distance must match the Google venue; existing photo Place IDs are reused. Only Place IDs persist, not hours. Loading, lookup errors (with Retry), and no matching hours are separate states. This endpoint has a separate 300 attempts/site/UTC-day cap. Test: node scripts/test-venue-hours.mjs.
