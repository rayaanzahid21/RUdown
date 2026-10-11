# Nearby venue search

Find nearby places now uses Google Places API (New), through the same /api/discover endpoint as the map's area search. It no longer calls Gemini Maps grounding. The old /api/places endpoint returns 410 with a refresh instruction so stale tabs cannot consume Gemini quota.

After consent, the button searches within 10 miles of the approximate center of ready, attending members' saved coordinates. The center is rounded to two decimal places. Only the center and category go to Google; names, budgets, addresses and conflict notes do not. Costs and group ranking are calculated in RUdown. Members' origins stay unchanged.

Coffee searches use cafe/coffee_shop primary types; restaurants use restaurant; other options cover parks, attractions and entertainment. Overnight trips search hotels. Results replace the cards and Google map below, with ratings where available and editable cost allowances. They can be selected as a group plan. No prices, opening hours or availability are inferred from the rating.

Both search entry points share the 200 attempts/site/UTC-day limit and the server-only GOOGLE_PLACES_API_KEY. Provider rate/quota limits and access-denied errors are distinguished from RUdown's own cap. There are no automatic retries. Gemini remains separate for conflict advice. See LIVE-DISCOVERY.md for selection and persistence details.

Run node scripts/test-place-search.mjs and node scripts/test-discovery.mjs.
