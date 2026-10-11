# Nearby venues and Gemini Maps search

Discover plans contains named destinations, not templates centered on a member's home. Woodbridge coffee includes LeGrand Coffee House (10 Green Street); Metuchen includes Hatch44 Cafe (25 New Street). Ratings are Google ratings reported by Restaurant Guru, checked October 11, 2026; the cards link the source and date. Other venues do not display invented ratings. Unpriced costs remain labeled planning allowances. Hotel allowances are not room quotes.

The Find places with Gemini panel calls `/api/places` for authenticated groups after explicit consent. It sends approximate coordinates rounded to two decimals, interests, group size, travel limits and the lowest budget. It does not send names, exact address labels, calendar contents or conflict notes. It explicitly enables `googleMaps`, requires Maps grounding sources, and renders those links immediately below the result. Results stay in component memory, are cleared on preference changes, are not persisted in group JSON or the search cache, and use `Cache-Control: no-store`.

Search categories cover coffee, restaurants, parks, attractions, entertainment and hotels. Search results are suggestions to investigate, not automatic bookings or verified cost allocations. Existing named plans use RUdown's deterministic calculations. Other places can be proposed through Ideas & votes.

The server reuses `GEMINI_API_KEY`. Optional `GEMINI_MAPS_MODEL` overrides `GEMINI_PLANNING_MODEL`; default is `gemini-3.5-flash-lite`. Maps support and billing depend on the API model and project. A Gemini consumer subscription does not establish API quota. Check Google AI Studio's API project limits and Google's API pricing before enabling billing. The implementation never enables billing automatically.

Limits: 10 requests/group/day and 100/site/day, including failed provider attempts. No automatic retries. Unauthorized requests never reach Gemini. Google quota, model and timeout failures display an error while leaving curated named plans available. Public demo uses curated venues and explains that live search requires a real group.

Verification on October 11: the existing key's Gemini 2.5 Flash request returned 404; Gemini 3.5 Flash-Lite Maps requests returned 429 RESOURCE_EXHAUSTED. Successful grounded live results remain unverified until the project has Maps quota. Automated route tests cover supported response rendering data, auth, consent, quota failures and stale group responses.
