# OpenNode Integration Plan (Replace BoomFi, Keep Stripe)

## Objectives

- Replace BoomFi entirely with OpenNode for BTC/Lightning payments.
- Keep Stripe as the source of truth for invoices, emails, and business logic.
- Preserve existing backend flows by marking Stripe invoices paid when OpenNode confirms payment.

## Scope

- Remove all BoomFi code, config, and webhooks; not used in production.
- Add OpenNode using Hosted Checkout via a link embedded in Stripe invoices.
- Maintain Stripe card flows unchanged.

## High-Level Approach

1. Continue creating Stripe Invoices as today (draft → finalize → email/send).
2. Inject a stable, first‑party “Pay with Bitcoin (OpenNode)” link into each Stripe invoice.
3. When the customer clicks the link, our app creates an OpenNode charge on demand and redirects to Hosted Checkout.
4. On OpenNode webhook (paid/confirmed), mark the Stripe invoice paid out‑of‑band and trigger existing fulfillment.

Why a stable link? OpenNode charges expire; don’t email the raw `hosted_checkout_url`. Instead, send a signed link that creates a new charge each time it’s visited.

## Architecture

- Payment service supports two providers:
  - Stripe: cards (unchanged)
  - OpenNode: bitcoin (new)
- Normalize events to internal domain states: Pending, Succeeded, Failed/Expired, Underpaid, Overpaid.
- Persist internal Payment record or mapping: `provider`, `provider_id`, `stripe_invoice_id`, `status`, `amount`, `currency`, `metadata`.

## Next.js / Vercel Design

Use App Router Route Handlers for serverless endpoints.

- `app/api/pay/bitcoin/[invoiceId]/route.ts` (GET)
  - Validates `token` (HMAC of `invoiceId|exp`) using `PAYLINK_SIGNING_SECRET`.
  - Fetches Stripe invoice; ensures it is payable (`open` or `draft`) and `amount_remaining > 0`.
  - Creates an OpenNode charge using invoice amount/currency.
  - Persists mapping (`opennode_charge_id` ↔ `invoice_id`).
  - 302 redirects to OpenNode Hosted Checkout URL with optional query params.

- `app/api/webhooks/opennode/route.ts` (POST)
  - Reads raw body and verifies OpenNode signature.
  - Handles charge events; maps `paid/confirmed` to Stripe invoice paid out‑of‑band.
  - Enforces idempotency using `charge.id`.

Notes

- Keep the raw request body for signature validation.
- Return 2xx for processed events to avoid retries; 4xx only for invalid signatures.

## Hosted Checkout Details

- Base URLs:
  - Development: `https://checkout.dev.opennode.com/{id}`
  - Production: `https://checkout.opennode.com/{id}`
- Options:
  - Default Lightning: `?ln=1`
  - Hide fiat value: `?hf=1`

## Stripe Invoice Authoring

During invoice creation (draft):

- Generate a signed pay link: `https://<your-domain>/api/pay/bitcoin/{invoiceId}?token=<HMAC>`
- Attach prominently to the invoice:
  - `description`: `Pay with Bitcoin (OpenNode): <link>`
  - `footer`: `Prefer Bitcoin? Use OpenNode: <link>`
  - `custom_fields`: `[ { name: 'Bitcoin (OpenNode)', value: '<link>' } ]`
  - `metadata.bitcoin_pay_url = <link>`
- Finalize and send the invoice as usual so the email shows the link.

## OpenNode Charge Creation

Minimal payload (amount in fiat):

```
{
  amount: <invoice.amount_remaining / 100>,
  currency: <invoice.currency.toUpperCase()>,
  description: `Invoice ${invoice.number || invoice.id}`,
  customer_email: <from invoice/customer>,
  notif_email: <from invoice/customer>,
  customer_name: <from customer if available>,
  order_id: <internal reference if applicable>,
  callback_url: <NEXTAUTH_URL>/api/webhooks/opennode,
  success_url: <NEXTAUTH_URL>/dashboard?paid=true&crypto=true,
  auto_settle: <true|false per treasury policy>,
  ttl: <optional minutes>,
  metadata: { stripe_invoice_id: invoice.id, customer_id: invoice.customer }
}
```

Response includes `hosted_checkout_url` and `id`.

## Webhooks (OpenNode → Our App)

- Endpoint: `POST /api/webhooks/opennode`
- Verify signature using the OpenNode SDK (`signatureIsValid`).
- Extract: `charge.id`, `charge.status`, `metadata.stripe_invoice_id`.
- Idempotency: process each `charge.id` once.
- Status mapping:
  - `paid` or `confirmed` → `stripe.invoices.pay(invoiceId, { paid_out_of_band: true })` with idempotency key = `charge.id`; emit internal fulfillment event(s).
  - `expired` or `cancelled` → keep invoice open; customer can repay.
  - `underpaid` / `overpaid` → follow configured credit/refund policy; do not auto‑pay invoice.

## Environment Variables (Vercel)

- `STRIPE_SECRET_KEY`
- `OPENNODE_API_KEY`
- `NODE_ENV` (`development` or `production`)
- `NEXTAUTH_URL` (base URL of the application, webhook path `/api/webhooks/opennode` will be appended)
- Success URL will be constructed using `NEXTAUTH_URL` + `/dashboard?paid=true&crypto=true`
- `PAYLINK_SIGNING_SECRET`
- Optional flags: `OPENNODE_CHECKOUT_DEFAULT_LN` (`true|false`), `OPENNODE_CHECKOUT_HIDE_FIAT` (`true|false`)

## Initialization Snippets

- OpenNode:

```
import opennode from 'opennode';
opennode.setCredentials(process.env.OPENNODE_API_KEY, process.env.NODE_ENV === 'development' ? 'dev' : 'live');
```

- Stripe:

```
import { stripe } from '@/lib/stripe-server';
```

## Route Handler Sketches

- `app/api/pay/bitcoin/[invoiceId]/route.ts` (GET)

```
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { stripe } from '@/lib/stripe-server';
import opennode from 'opennode';
opennode.setCredentials(process.env.OPENNODE_API_KEY, process.env.NODE_ENV === 'development' ? 'dev' : 'live');

function verifyToken(invoiceId: string, token: string) {
  // token = base64url(HMAC_SHA256(invoiceId|exp, secret)) + "." + exp
  const [sig, expStr] = (token || '').split('.');
  if (!sig || !expStr) return false;
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return false;
  const payload = `${invoiceId}|${expStr}`;
  const expected = crypto
    .createHmac('sha256', process.env.PAYLINK_SIGNING_SECRET!)
    .update(payload)
    .digest('base64url');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function GET(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  const invoiceId = params.invoiceId;
  const token = req.nextUrl.searchParams.get('token') || '';
  if (!verifyToken(invoiceId, token)) {
    return new NextResponse('Invalid token', { status: 401 });
  }

  const invoice = await stripe.invoices.retrieve(invoiceId);
  if (!invoice || !['draft', 'open'].includes(invoice.status!) || (invoice.amount_remaining || 0) <= 0) {
    return new NextResponse('Invoice not payable', { status: 400 });
  }

  const amount = (invoice.amount_remaining || 0) / 100;
  const currency = (invoice.currency || 'usd').toUpperCase();

  const charge = await opennode.createCharge({
    amount,
    currency,
    description: `Invoice ${invoice.number || invoice.id}`,
    customer_email: (invoice.customer_email || undefined),
    notif_email: (invoice.customer_email || undefined),
    callback_url: `${process.env.NEXTAUTH_URL}/api/webhooks/opennode`,
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?paid=true&crypto=true`,
    auto_settle: false,
    metadata: { stripe_invoice_id: invoice.id, customer_id: invoice.customer },
  });

  let url = charge.data.hosted_checkout_url || `https://checkout.opennode.com/${charge.data.id}`;
  const paramsArr: string[] = [];
  if (process.env.OPENNODE_CHECKOUT_DEFAULT_LN === 'true') paramsArr.push('ln=1');
  if (process.env.OPENNODE_CHECKOUT_HIDE_FIAT === 'true') paramsArr.push('hf=1');
  if (paramsArr.length) url += (url.includes('?') ? '&' : '?') + paramsArr.join('&');

  return NextResponse.redirect(url, { status: 302 });
}
```

- `app/api/webhooks/opennode/route.ts` (POST)

```
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import opennode from 'opennode';
opennode.setCredentials(process.env.OPENNODE_API_KEY, process.env.NODE_ENV === 'development' ? 'dev' : 'live');

export const runtime = 'nodejs'; // keep raw body

export async function POST(req: NextRequest) {
  const raw = await req.text();
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  try {
    const valid = await opennode.signatureIsValid(event);
    if (!valid) return new NextResponse('Bad signature', { status: 400 });
  } catch {
    return new NextResponse('Signature check failed', { status: 400 });
  }

  const charge = event.data || event.charge || {};
  const status: string = charge.status;
  const chargeId: string = charge.id;
  const invoiceId: string | undefined = charge.metadata?.stripe_invoice_id;

  if (!chargeId || !invoiceId) return new NextResponse('OK', { status: 200 });

  if (status === 'paid' || status === 'confirmed') {
    try {
      await stripe.invoices.pay(
        invoiceId,
        { paid_out_of_band: true },
        { idempotencyKey: chargeId }
      );
      // TODO: emit internal fulfillment events if applicable
    } catch (e) {
      // Intentionally swallow duplicate/idempotent attempts
    }
  }

  return new NextResponse('OK', { status: 200 });
}
```

## Security

- HMAC‑sign pay links with short TTL; verify on each click.
- Validate OpenNode webhook signatures with the SDK; reject invalid requests.
- Use `charge.id` as an idempotency key for Stripe payment updates and internal state transitions.
- Do not log secrets or full webhook payloads with PII.

## Operational Policies

- Auto‑settle: decide whether to convert to fiat (`true`) or hold BTC (`false`).
- Expired charges: link remains valid; clicking regenerates a new charge.
- Under/overpayment: document credit/refund policy and ensure invoices are not auto‑paid in these cases.

## Observability

- Structured logs around: charge creation, webhook receipt, state transitions.
- Metrics: success rate, time‑to‑confirmation, expired/under/overpaid counts.
- Alerts: webhook signature failures, high expiration rate.

## Testing

- Unit: HMAC verification, status mapping, idempotency, invoice link injection.
- Integration (dev): click pay link → redirect to Hosted Checkout → webhook → Stripe invoice paid.
- E2E: ensure Stripe card flow unchanged; Bitcoin path completes fulfillment.
- Reconciliation: scheduled task compares OpenNode charges with internal records and Stripe invoice statuses.

## Rollout Plan

1. Development
   - Implement handlers, invoice link injection, and webhook.
   - Test with `NODE_ENV=development` and a dev webhook URL.
2. Staging
   - Send test invoices; verify payments, expirations, and retries.
   - Monitor logs/metrics for 24–48 hours.
3. Production
   - Enable OpenNode; ensure ability to disable bitcoin quickly via feature flag.
   - Remove BoomFi code/config/CI secrets.
4. Post‑Cutover
   - Monitor for 1–2 weeks; finalize documentation.

## Acceptance Criteria

- End‑to‑end BTC payment marks the corresponding Stripe invoice paid.
- Stripe card payments remain fully functional.
- Webhooks are verified, idempotent, and trigger existing fulfillment.
- No BoomFi references remain in code, config, or CI.
- Logs/metrics available for OpenNode events and payment outcomes.

## Open Decisions

- Treasury: `auto_settle=true` vs `false`.
- UX: default Lightning, hide fiat (`ln=1`, `hf=1`).
- Under/overpayment handling: credit notes, refunds, or manual intervention.
- Invoice link TTL length and refresh strategy.

## Implementation Checklist

- [ ] Add env vars in Vercel (`OPENNODE_API_KEY`, `PAYLINK_SIGNING_SECRET`). Note: `NEXTAUTH_URL` should already exist.
- [ ] Implement `app/api/pay/bitcoin/[invoiceId]/route.ts`.
- [ ] Implement `app/api/webhooks/opennode/route.ts`.
- [ ] Inject signed pay link into Stripe invoices (description, footer, custom_fields, metadata).
- [ ] Add persistence for `opennode_charge_id ↔ stripe_invoice_id` mapping if needed.
- [ ] Logging/metrics for creates, webhooks, and transitions.
- [ ] Remove BoomFi SDK, routes, webhooks, envs, CI secrets, and docs.
- [ ] Test dev → staging → prod rollout.
