# RUdown escrow prototype — not deployed

The Rust program implements immutable SOL contributions, separate wallet approval,
organizer release to a fixed recipient, cancellation, and participant refunds before
release. It is source code, **not a tested or live payment integration**. The current
website only exposes an authenticated, read-only escrow preview. No funds are held.

## Current limits

- Rust, Cargo, Solana CLI, Anchor, Docker and an installed WSL distribution were
  unavailable in the development environment. The program has not been compiled,
  run against a validator, audited, or deployed. The validator test suite is provided
  but has not been executed. Do not enable deposits based only on TypeScript tests.
- The program ID in source is a local placeholder, not a deployed account.
- App approvals and on-chain approvals are different. Editing the web plan cannot
  revoke an on-chain transaction. Cancel the old escrow on chain before accepting
  a revised plan, then refund and create new immutable terms. A future wallet UI
  must enforce this workflow and show the committed recipient and every amount.
- Funds released to the recipient cannot be clawed back. Refund and release races
  are ordered by the chain; a refund succeeds only if release has not happened.
- Account rent stays in the escrow account. No close-account path is included.
- Test cap: 0.1 SOL per member, 12 members, deadline within 30 days. Chain programs
  are not intrinsically Devnet-only; use Devnet/localnet deployment and clients only.
- The web preview allocates 0.001 **test** SOL per attending member independently of
  their USD estimate. It is not a USD/SOL conversion or a real payment quote.

## Build and verify in Linux, macOS, or WSL

Use the [official Anchor installation instructions](https://www.anchor-lang.com/docs/installation).
This prototype pins the matched Anchor Rust and JS versions to 0.32.1 and Solana
2.3.0, as documented in [those release notes](https://www.anchor-lang.com/docs/updates/release-notes/0-32-1).
Use a new **test-only** wallet. Do not import a wallet that holds real assets.

From this `solana` directory, with that toolchain installed:

```sh
npm install
anchor build
anchor keys sync
anchor build
anchor test
```

Keep the generated wallet and `target/deploy/*-keypair.json` private and untracked.
`anchor keys sync` must replace the placeholder in both source and Anchor.toml.
Review every compiler warning and run the local-validator suite before any deploy.
The suite exercises unauthorized access, wrong commitment, duplicate deposits,
incomplete approvals, recipient substitution, release, cancellation and refunds.
Expand it with deadline and concurrency scenarios before handling anything of value.

## Devnet deployment after successful tests

Use a test wallet funded through the [Solana Devnet faucet](https://faucet.solana.com/).
Deploy explicitly to Devnet, never default to a remembered mainnet configuration:

```sh
anchor deploy --provider.cluster devnet
```

Record the actual program ID and deployed binary/IDL. Verify the deployment using
the Devnet Explorer and run the lifecycle again with test funds. No deployment or
funding commands have been executed by this change.

## Remaining website wiring

1. Add wallet signature challenges to bind each group member to a public key.
2. Match the generated IDL to the deployed program ID and fix the RPC to Devnet.
3. Persist each escrow's PDA, recipient, nonce and plan commitment; never trust a
   transaction signature alone. Read and verify confirmed program account state.
4. Build unsigned transactions from the IDL. Require explicit wallet signatures for
   each deposit, approval, cancellation, refund and release; keep private keys out
   of the server. Preview every amount and recipient before signing.
5. Block plan edits while an escrow is open until cancellation is confirmed on
   chain. Treat expired escrows as refundable, never releasable. Verify version
   commitments, and handle wallet rejection, RPC errors and concurrent actions.
6. Enable deposit buttons only after the integrated lifecycle tests pass.

`GET /api/escrow?code=...` already requires group membership and returns a current
plan fingerprint plus test contribution preview. It intentionally returns
`depositsEnabled: false` until the deployment and wallet wiring above are complete.
