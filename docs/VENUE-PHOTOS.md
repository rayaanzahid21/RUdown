# Google Places venue photos

The integration is implemented but photos require a separate server key. Gemini and Calendar credentials do not enable Places automatically.

1. In Google Cloud, select the project you want billed for Maps usage.
2. Enable **Places API (New)** in APIs & Services → Library. Google requires Maps billing; review pricing before enabling it.
3. In APIs & Services → Credentials, create an API key and restrict its API access to **Places API (New)**. This is a server key, so website/referrer restrictions are not suitable. IP restrictions require known fixed outbound IPs; this site's shared Worker hosting does not provide a dedicated egress IP.
4. Save it as the secret runtime variable `GOOGLE_PLACES_API_KEY` in Sites, then redeploy. Never put it in a `NEXT_PUBLIC_` variable or commit it. For local development only, put it in the ignored `.env.local` file and restart.
5. Open Discover plans and scroll to the venue. Photos load only when a card is visible. Reload the page after activating the key.

If using this chat to configure the secret, save `GOOGLE_PLACES_API_KEY=your-key` in the local ignored `.env.local` file and say it is saved. Do not paste the key in chat. The agent can transfer it privately into the hosting secret configuration.

The backend accepts only curated activity IDs. It matches the venue name and requires the result to be within one mile of the known coordinates before using Google's Place ID. Ambiguous matches, missing photos, image failures, missing keys, and provider errors retain the illustrated fallback. Matches are conservative, not a guarantee; review the venue link when activating photos.

Only Place IDs are persisted (180 days). Photo names, image URLs and credits are retrieved fresh, never written to the database or service-worker cache. API responses use `Cache-Control: no-store`; a returned Google image URL is used directly in the browser. Google Maps and photographer links appear with the photo, outside the plan-opening button.

A shared server limit allows at most 300 photo attempts per UTC day; each attempt may invoke Text Search/Place Details and Photo Media. This is an application safeguard, not a Google billing cap. Configure Google quotas and billing alerts separately. No billing is enabled automatically.

References: https://developers.google.com/maps/documentation/places/web-service/place-photos and https://developers.google.com/maps/documentation/places/web-service/policies
