# Stripe card checkout setup

RUdown features Solana first and offers a separate hosted card checkout. Both are currently demos: Solana deposits are disabled, and card checkout accepts only Stripe test keys. A real charge or venue booking is never implied.

1. Create your account at https://dashboard.stripe.com/register.
2. Open a Stripe sandbox / test environment. In Developers → API keys, copy its **secret test key** (starts with `sk_test_`). Do not use a live key.
3. Save `STRIPE_SECRET_KEY=your_test_key` in the ignored local `.env.local`, alongside the existing Gemini key. Keep all existing values. Do not paste the key in chat or put it in frontend variables.
4. Have the site maintainer securely copy that value into Sites environment variables as a **secret**, then deploy the site so the binding takes effect. Local `.env.local` alone does not configure the hosted Worker.
5. Create a real RUdown group. Save each person's preferences, select a plan, and have every attending member approve their exact share. Open Group wallet → Credit / debit card.
6. Continue to Stripe test checkout. Use Stripe's documented test card `4242 4242 4242 4242`, a future expiration, and any three-digit CVC; never use a real card in testing. Return to RUdown and confirm that the panel says Stripe verified the test payment.

Reference: https://docs.stripe.com/testing and https://docs.stripe.com/payments/checkout

The backend derives the amount from saved expenses, authenticates membership, checks approvals, rejects live keys, and uses one idempotency key per member/plan version. It stores checkout IDs in D1. A return URL is never trusted as proof of payment: the server retrieves the session from Stripe and validates the contribution ID, currency, total, mode, and completion status. A changed plan is not automatically paid or refunded. Prior paid test contributions block further checkout until reviewed; this is a prototype, not a full billing system.

Before real payments: define the merchant, fulfillment, refunds, payout recipients and legal terms; integrate signed Stripe webhooks and durable reconciliation; handle disputes and refund state; expire outstanding checkout sessions on every plan/approval change; and test concurrent edits and checkout completion. Browser-return reconciliation is sufficient only for this explicitly labeled test demonstration. There is no Stripe Connect transfer, real booking, or bridge into Solana escrow.
