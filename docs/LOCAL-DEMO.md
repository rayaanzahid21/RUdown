# Live Rutgers demo

The landing page renders `LivePlanner`, the same component used inside the interactive demo. It calls the shared `recommendation`, `expensesFor`, `shares`, and `mutate` functions, not a mock price widget. Opening the computed plan transfers the current crew and selected activity into the full planner. This is interactive product UI, not a screenshot or prerecorded animation.

## 20-second walkthrough

1. Start with four different budgets: $50, $20, $35, $75. The origins are College Avenue, Busch, Livingston, and Douglass student centers.
2. The initial recommendation is Rutgers Cinema. Its published regular general-admission rate is $11.50 per person. Campus bus fare is $0. Personal optional allowances are $5, $2, $0, and $8, for a computed group planning total of $61.
3. Lower Maya's budget from $20 to $8. Cinema no longer fits; a free-admission museum moves above it. Show each person's revised total.
4. Expand **Why this plan?** for the ranking and travel tradeoffs. Open the computed plan to inspect expenses, individual approvals, calendar export, and the conflict response form.

## Source register — checked October 11, 2026

- [Rutgers Cinema](https://www.rutgerscinema.com/about--contact): regular general admission $11.50. Discounted/early rates are not automatically assumed. [Purchase policy](https://www.rutgerscinema.com/purchase-policy): online admin fees may apply. These are not included until a participant enters an allowance or the organizer adds the confirmed fee.
- [Zimmerli Art Museum](https://zimmerli.rutgers.edu/visit): admission free; verify opening hours and group requirements.
- [Rutgers Geology Museum](https://geologymuseum.rutgers.edu/visit-the-museum): admission free; verify hours and accessibility.
- [Rutgers Gardens](https://www.rutgersgardens.rutgers.edu/visit): admission free; group visit arrangements, Monday closure, seasonal hours and transport require checking. Direct campus-bus access is not assumed.
- [Rutgers campus bus service](https://ipo.rutgers.edu/transportation/buses/nb): no fare; use current routes and TripShot for service. $0 is the campus fare only, not a promise of free travel to campus from any address.

These are published reference prices, not a live ticketing feed. Dates, showtimes, capacity, opening hours, fees and route availability are not checked automatically. Coordinates and distances are approximate; miles are straight-line distances, not road miles or transit travel times. Food is a user-entered allowance, not a restaurant quote.

## Fairness

Candidates that meet every saved budget, travel limit and modeled requirement rank before candidates that do not. Within each class:

`score = round(100 + 2 * preferenceMatches - 0.2 * longestStraightLineMiles - average(2 * milesOverLimit + dollarsOverBudget) - 12 * unresolvedRequirements)`

This is a transparent heuristic, not an optimal routing solver. Budgets are caps, not contributions. Personal transport and allowances are charged only to their owner. Shared expenses split equally among selected attendees; remainder cents use stable member-ID order. Nobody is automatically subsidized. Published expense rows are protected from arbitrary edits. Updating preferences recalculates managed rows, preserves custom expenses, and clears approvals.

Real groups change only their own inputs. The sample crew is explicitly labeled editable demo data. AI explains conflicts when configured; deterministic arithmetic and access checks remain authoritative.

## Payments

Solana constructs and verifies direct Devnet test contributions with plan-version receipts. The escrow source remains undeployed; no automatic releases or refunds are implemented. Stripe test checkout requires `STRIPE_SECRET_KEY` and remains a separate flow. There is no combined funded balance, conversion, booking, or transfer from Stripe into Solana.
