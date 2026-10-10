# Google Calendar setup

RUdown supports two paths:

- **One-click add** opens a Google Calendar event draft with the outing dates, venue, itinerary and the current member's cost. The user saves it. It is a snapshot and does not update automatically.
- **Connected sync** uses Google's server OAuth flow and encrypted refresh tokens. Each member opts in separately for each group. After everyone approves a dated plan, RUdown creates one event in that person's primary calendar. Subsequent approved versions update the same event. A change or withdrawn approval marks the previous event tentative and “Needs reapproval”; its previous time/location remain until the new version is approved. No email invitations are sent.

Connected sync is implemented but disabled until the environment below is configured. It has been tested with mocked Google responses; a real OAuth consent and live Calendar round trip still need validation after setup. The app uses Google directly because Sites' connected-app eligibility discovery is not available in this session.

## Configure your Google Cloud project

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/) and enable **Google Calendar API**.
2. Set up **Google Auth Platform** branding/audience. For the hackathon, use External / Testing and add every demo account as a test user. Request `https://www.googleapis.com/auth/calendar.events.owned` under Data Access. RUdown only writes its own known event IDs; the Google permission itself allows management of events on calendars the user owns.
3. Create an OAuth client of type **Web application**. Add this exact authorized redirect URI:

   `https://rudown.rayaanzahid06.chatgpt.site/api/calendar/callback`

4. Save the client ID and client secret securely. Do not put the secret in source code, `.openai/hosting.json`, a screenshot, or chat.
5. Configure the following **server runtime environment variables** in Sites, then redeploy to apply them:

| Variable | Value | Secret? |
| --- | --- | --- |
| `GOOGLE_CALENDAR_CLIENT_ID` | The Web OAuth client ID | No |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Its client secret | Yes |
| `CALENDAR_ENCRYPTION_KEY` | 32 random bytes encoded as 64 hexadecimal characters | Yes |
| `CALENDAR_APP_ORIGIN` | `https://rudown.rayaanzahid06.chatgpt.site` (no trailing slash) | No |

Generate the encryption key with a secure password/secret tool or Node's `crypto.randomBytes(32).toString('hex')`, and transfer it straight into the runtime secret field. Keep the key stable: changing it makes existing encrypted refresh tokens unreadable. Disconnect and reconnect members after a key rotation. Local environment files must remain ignored.

The app intentionally requires HTTPS for OAuth and its secure callback cookie. Test the real flow on the hosted site; the localhost preview can test one-click export, scheduling and the unconfigured state.

## Verify before presenting

1. Open the hosted site as an allowed visitor. Create a real group and complete preferences.
2. Select a plan and save its start/end. Times are entered in the device time zone and displayed in the saved zone; Google receives UTC instants plus the zone.
3. Click **Connect & enable sync**, review Google's consent screen, and return to RUdown. The member's group access must still be stored in this browser.
4. Have everyone approve. Confirm one event appears in the connected user's primary calendar, with the correct time, location, itinerary and personal share.
5. Change the outing time or an expense. Confirm the existing event becomes tentative. Reapprove and verify the same event changes, rather than creating another.
6. Disconnect. Future plan changes must stop updating that calendar. Existing events stay in Google Calendar for the user to delete. Permission can also be revoked in the user's Google Account settings.

Use either manual add or connected sync for a given plan; an independently saved manual event is not adopted by sync. Connecting a different Google account can leave the old account's event in place. If an event was deleted externally, disconnect and connect again to create a new one.

## Hackathon limits

- Google consent / verification requirements and test-user restrictions still apply. Testing-mode refresh tokens can expire; reconnect when needed. See [Google's OAuth web server guide](https://developers.google.com/identity/protocols/oauth2/web-server).
- Event writes run on saved group changes, including when the connected member has closed the app. Network failures show a retry/reconnect status. There is no durable background retry queue; use **Retry sync** after an outage.
- This is one-way RUdown → Google sync. Google edits do not change RUdown, and future sync can overwrite the fields RUdown manages. The app does not read calendar availability.
- Only the organizer edits the schedule. Date/time changes reset every financial approval. An approval is not a venue reservation or payment.
- The existing private hosting audience is unchanged. Friends need hosting access as well as a RUdown group invite.

Developer checks: `node scripts/test-domain.mjs`, `node scripts/test-calendar.mjs`, and `node scripts/test-api.mjs` (with the local preview running).
