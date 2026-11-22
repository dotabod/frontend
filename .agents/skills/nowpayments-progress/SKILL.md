---
name: nowpayments-progress
description: Verify NOWPayments progress writes when changing webhook delivery, reconciliation, or invoice status persistence.
---

# NOWPayments invoice progress

A late progress write must leave a finished invoice finished. Two deliveries of the same partial payment must raise one warning while the stored status stays partially paid.

The model in `formal/nowpayments-progress/PaymentProgress.tla` covers one invoice, one activation, and at most one partially paid delivery each from the webhook and reconciliation. Each delivery reads before writing. The model treats the conditional PostgreSQL update in `recordNowPaymentsProgress` as atomic and counts the warning that an accepted update emits. It leaves out Stripe activation internals, other status transitions, retries after a worker crash, and alert delivery failures.

- `ReadInvoice` represents the read in `src/pages/api/webhooks/nowpayments/index.ts` or the batch read in `src/lib/nowpayments-reconcile.ts`.
- `Activate` represents the finished-status write in `processConfirmedNowPaymentsPayment` in `src/lib/nowpayments-payment.ts`.
- `WritePartialProgress` represents `recordNowPaymentsProgress` in `src/lib/nowpayments-progress.ts`, including the update count that controls warning emission.

Use the CI job on a feature branch. To reproduce on a development machine, download `tla2tools.jar` from the TLA+ v1.7.4 release, verify SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`, and run `bash formal/nowpayments-progress/check.sh /absolute/path/to/tla2tools.jar`. Read each result with the `/statechart` skill. A historical run must fail on its named invariant. The PostgreSQL and HTTP checks in CI exercise the application write and webhook.

The overwrite replay reads a waiting invoice, commits activation, then applies the stale progress update without the guard introduced in `3facf0b6`. The duplicate replay lets both deliveries read waiting before either commits. Without the duplicate guard, each emits a warning.

The covered code and model were last compared at `b0a333ab`. On changes to a covered path, compare the real reads, writes, and alert emission with the actions above. Run CI and update the sync revision once the model matches.
