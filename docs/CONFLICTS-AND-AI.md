# Plan responses and recommendations

Open **Our plan → This doesn’t work for me**. Choose time, budget, distance,
transportation, activity, or Other. Share a note and up to three future availability
windows. Budget feedback updates that member's budget. All feedback and structured
inputs are group-visible; the UI explains this before saving.

Saving feedback clears all plan approvals. Only the author can resolve their own
concern. Resolving does not approve spending. Selecting an alternative replaces the
expense estimates, preserves concerns, and requires everyone to review again.
Availability suggestions disclose missing people and never read calendar events.
Sitting out removes the member from split costs and approval requirements. Rejoining
clears the selected plan so the organizer must explicitly rebuild with that person.
Connected calendars mark a former attendee's existing event as tentative and free;
no new event is created for a person who is sitting out.

## Gemini AI integration

The server integration calls Gemini generateContent with a JSON schema using
`gemini-3.5-flash-lite`. A live request with fictional group feedback passed.
Calculated alternatives continue to work if the provider is unavailable.

After completing secure key provisioning, configure the secret `GEMINI_API_KEY` in
the site's server environment and redeploy. Never put it in a NEXT_PUBLIC variable,
source file, screenshot, chat, or browser bundle. `GEMINI_PLANNING_MODEL` optionally
overrides the default `gemini-3.5-flash-lite`. Google Calendar credentials are unrelated.
This model offers free-tier usage, subject to Google's project tier and quotas.
The integration does not enable billing or switch to a paid provider on failure.

Group members must explicitly consent before sending shared notes, budgets,
preferences and candidate dates. The payload excludes auth hashes, invite codes,
precise saved locations, group names, calendar tokens and participant names; free
text can still contain names or other information that people typed themselves.
On Google's free tier, submitted content may be used to improve Google products;
the consent text explains this. The model cannot mutate plans or authorize payments.

The server enforces 10 calls/group/day and 100 calls/site/day (UTC), caches a group's
same-revision result for an hour, rejects stale results and times out after 25 seconds.
Quotas count attempted calls, including failures. Provider quota failures have a
specific retry-later message. The app returns generic failures without exposing credentials or
provider response bodies.

Validation: `node scripts/test-conflicts.mjs`, `node scripts/test-domain.mjs`,
`node scripts/test-calendar.mjs`, and TypeScript/build checks. AI transport is mocked
in automated tests. `node scripts/test-gemini-live.mjs` exercises the actual provider
with fictional data using the ignored local env file and prints no credentials.
