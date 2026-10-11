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

## Live AI setup pending

The server integration calls the OpenAI Responses API with a strict JSON schema.
There is currently **no configured OpenAI key** and no live AI request has been
verified. Calculated alternatives work without it and are labeled accordingly.

After completing secure key provisioning, configure the secret `OPENAI_API_KEY` in
the site's server environment and redeploy. Never put it in a NEXT_PUBLIC variable,
source file, screenshot, chat, or browser bundle. `OPENAI_PLANNING_MODEL` optionally
overrides the default `gpt-4.1-mini`. Google Calendar credentials are unrelated.

Group members must explicitly consent before sending shared notes, budgets,
preferences and candidate dates. The payload excludes auth hashes, invite codes,
precise saved locations, group names, calendar tokens and participant names; free
text can still contain names or other information that people typed themselves.
Requests use `store:false`. The model cannot mutate plans or authorize payments.

The server enforces 10 calls/group/day and 100 calls/site/day (UTC), caches a group's
same-revision result for an hour, rejects stale results and times out after 25 seconds.
Quotas count attempted calls, including failures. Set an account spending limit too
when provisioning. The app returns generic failures without exposing credentials or
provider response bodies.

Validation: `node scripts/test-conflicts.mjs`, `node scripts/test-domain.mjs`,
`node scripts/test-calendar.mjs`, and TypeScript/build checks. AI transport is mocked
in automated tests; a live request is still needed once a key is configured.
