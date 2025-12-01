# OpenNode Crypto Payment Troubleshooting Guide

## Overview

This guide covers how to diagnose and fix issues with OpenNode crypto payments that fail to create subscriptions.

## Common Issue: Payment Confirmed but No Subscription Created

**Symptoms:**

- OpenNode charge has `status='paid'` or `status='confirmed'`
- `lastWebhookAt` is `NULL` in the database
- User does not have a subscription
- Stripe invoice shows as "Incomplete" or "Open"

**Root Cause:**
The OpenNode webhook handler processed the payment notification but failed before completing the subscription creation. This can happen due to:

- Network timeout between OpenNode webhook and Stripe API
- Stripe API error during `invoice.pay()` call
- Database transaction failure
- Server crash or deployment during webhook processing

## Diagnostic Tools

### 1. Check Payment Status (No Changes)

Use the diagnostic script to check the current state of a payment:

```bash
# Using Stripe invoice ID
doppler run -- bun run scripts/check-opennode-payment.ts in_1234567890

# Using OpenNode charge ID
doppler run -- bun run scripts/check-opennode-payment.ts --charge-id 1234-5678-90
```

**Output includes:**

- OpenNode charge details and status
- Stripe invoice status
- User subscription status
- Analysis of what's wrong
- Recommendations for fixing

### 2. Fix Failed Payment Processing

Use the recovery script to complete the payment processing:

```bash
# Step 1: Always run in dry-run mode first (safe, no changes)
doppler run -- bun run scripts/fix-opennode-payment.ts --dry-run in_1234567890

# Step 2: If dry-run succeeds, run the actual fix
doppler run -- bun run scripts/fix-opennode-payment.ts in_1234567890
```

**What the recovery script does:**

1. Validates the OpenNode payment is actually 'paid' or 'confirmed'
2. Checks for existing subscription (prevents duplicates)
3. Retrieves and validates Stripe invoice metadata
4. Marks Stripe invoice as paid using `stripe.invoices.pay()`
5. Processes the invoice.paid event to create subscription
6. Verifies subscription was created successfully
7. Updates OpenNode charge `lastWebhookAt` timestamp
8. Outputs detailed results

**Safety Features:**

- ✅ Idempotency: Won't create duplicate subscriptions
- ✅ Dry-run mode for safe testing
- ✅ Database transactions (all-or-nothing)
- ✅ Comprehensive validation at each step
- ✅ Detailed logging and error reporting

## Production Usage

**IMPORTANT:** These scripts must be run in the production environment with production Stripe keys.

```bash
# SSH into production server or use your deployment pipeline
# Make sure STRIPE_SECRET_KEY is set to production key

# On production server:
doppler run -- bun run scripts/check-opennode-payment.ts <invoice_id>
doppler run -- bun run scripts/fix-opennode-payment.ts --dry-run <invoice_id>
doppler run -- bun run scripts/fix-opennode-payment.ts <invoice_id>
```

## Example Workflow: Fixing a Failed Payment

### Step 1: User Reports Issue

User "Mariachi" reports they paid via crypto but don't have access to PRO features.

### Step 2: Identify the Payment

Find the OpenNode charge in the database:

```sql
SELECT * FROM opennode_charges
WHERE "userId" = '1234567890'
ORDER BY "createdAt" DESC
LIMIT 1;
```

Note the `stripeInvoiceId`: `in_1234567890`

### Step 3: Diagnose

```bash
doppler run -- bun run scripts/check-opennode-payment.ts in_1234567890
```

**Expected output:**

```
❌ Issues Found:
   • OpenNode charge has never received a webhook (lastWebhookAt is NULL)
   • User does not have an active LIFETIME subscription

💡 Recommendations:
   • Run the recovery script to complete payment processing
```

### Step 4: Test Recovery (Dry Run)

```bash
doppler run -- bun run scripts/fix-opennode-payment.ts --dry-run in_1234567890
```

Review the output to ensure all validations pass.

### Step 5: Execute Recovery

```bash
doppler run -- bun run scripts/fix-opennode-payment.ts in_1234567890
```

**Expected output:**

```
✅ Subscription created successfully
   Subscription ID: sub_xxx
   Transaction Type: LIFETIME
   Status: ACTIVE
```

### Step 6: Verify

```bash
# Check again with diagnostic script
doppler run -- bun run scripts/check-opennode-payment.ts in_1234567890

# Or check subscription directly
SELECT * FROM subscriptions WHERE "userId" = '1234567890';
```

### Step 7: Notify User

Let the user know their account has been upgraded and they now have access to PRO features.

## Improved Webhook Handler

The webhook handler has been updated with improved error handling:

**Key Improvements:**

1. **Idempotency Check**: Prevents duplicate processing
2. **Manual Fallback**: If Stripe webhook doesn't fire, processes subscription directly
3. **Better Error Tracking**: Stores detailed error information in `metadata`
4. **Always Update Timestamp**: Even on failure, updates `lastWebhookAt` for tracking
5. **Comprehensive Logging**: All steps are logged for debugging

**File:** `src/pages/api/webhooks/opennode/index.ts`

## Monitoring & Prevention

### Database Queries for Monitoring

**Find stuck payments (paid but no webhook):**

```sql
SELECT
  "openNodeChargeId",
  "stripeInvoiceId",
  "userId",
  "status",
  "lastWebhookAt",
  "createdAt"
FROM opennode_charges
WHERE status IN ('paid', 'confirmed')
  AND "lastWebhookAt" IS NULL
ORDER BY "createdAt" DESC;
```

**Find users with paid charges but no subscription:**

```sql
SELECT
  onc."openNodeChargeId",
  onc."stripeInvoiceId",
  onc."userId",
  onc."status",
  onc."createdAt",
  s.id AS subscription_id
FROM opennode_charges onc
LEFT JOIN subscriptions s ON s."userId" = onc."userId"
  AND s."transactionType" = 'LIFETIME'
  AND s.status = 'ACTIVE'
WHERE onc.status IN ('paid', 'confirmed')
  AND s.id IS NULL
ORDER BY onc."createdAt" DESC;
```

### Recommended Alerts

Set up alerts for:

1. OpenNode charges with `status='paid'` and `lastWebhookAt=NULL` for more than 5 minutes
2. OpenNode charges with error metadata (`metadata.lastError` exists)
3. Failed Stripe invoice.pay() calls in logs

## Edge Cases

### Payment Already Processed

If the subscription already exists, the recovery script will:

- Detect the existing subscription
- Update `lastWebhookAt` if it's NULL
- Exit successfully with a message

### Invoice Already Paid in Stripe

The script handles this gracefully:

- Stripe will return "invoice_already_paid" error
- Script will continue with subscription creation
- No duplicate charges will occur

### Database Transaction Failures

If any step fails:

- The entire transaction is rolled back
- Error is logged with full stack trace
- `lastWebhookAt` is still updated with error metadata
- Can be retried safely

## Troubleshooting the Scripts

### "No such invoice" Error (Test vs. Production)

```
Error: No such invoice: 'in_1234567890';
a similar object exists in live mode, but a test mode key was used
```

**Solution:** Run the script in production with production Stripe keys. The invoice ID indicates a production invoice (`in_1...` format).

### "Subscription already exists" Warning

This is normal and indicates the payment was already processed. The script will exit successfully.

### "Invoice missing userId in metadata"

The Stripe invoice is missing required metadata. Check:

1. How the invoice was created
2. If metadata was properly passed during OpenNode checkout
3. If manual intervention is needed to add metadata

## Support

For additional help:

1. Check the error logs in the recovery script output
2. Review the OpenNode charge metadata in the database
3. Check Stripe dashboard for invoice details
4. Contact support with the invoice ID and error message

## Related Files

- **Recovery Script:** `scripts/fix-opennode-payment.ts`
- **Diagnostic Script:** `scripts/check-opennode-payment.ts`
- **Webhook Handler:** `src/pages/api/webhooks/opennode/index.ts`
- **Invoice Event Handler:** `src/pages/api/stripe/handlers/invoice-events.ts`
- **Subscription Utils:** `src/pages/api/stripe/utils/subscription-utils.ts`
