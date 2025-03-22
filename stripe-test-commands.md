# Stripe CLI Test Commands

## Setup

First, ensure you have the Stripe CLI installed and authenticated:

```bash
# Login to Stripe
stripe login

# Start webhook forwarding (run this in a separate terminal)
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

## Price IDs for Testing

For testing purposes, use these price IDs (or set environment variables):

```bash
# Monthly subscription price
PRICE_ID_MONTHLY="${NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID:-price_monthly123}"

# Annual subscription price
PRICE_ID_ANNUAL="${NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID:-price_annual123}"

# Lifetime purchase price
PRICE_ID_LIFETIME="${NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID:-price_lifetime123}"
```

## Test Commands for Different Event Types

### Subscription Events

```bash
# Test subscription created event (monthly)
stripe trigger customer.subscription.created \
  --add "subscription:status=active" \
  --add "subscription:current_period_end=1714503845" \
  --add "subscription:customer=cus_test123" \
  --add "customer:metadata.userId=user_123" \
  --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
  --add "subscription:items[0][price][product]=prod_test123"

# Test subscription created event (annual)
stripe trigger customer.subscription.created \
  --add "subscription:status=active" \
  --add "subscription:current_period_end=1746039845" \
  --add "subscription:customer=cus_test123" \
  --add "customer:metadata.userId=user_123" \
  --add "subscription:items[0][price][id]=$PRICE_ID_ANNUAL" \
  --add "subscription:items[0][price][product]=prod_test123"

# Test subscription updated event
stripe trigger customer.subscription.updated \
  --add "subscription:status=active" \
  --add "subscription:current_period_end=1714503845" \
  --add "subscription:customer=cus_test123" \
  --add "customer:metadata.userId=user_123" \
  --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
  --add "subscription:items[0][price][product]=prod_test123"

# Test subscription deleted event
stripe trigger customer.subscription.deleted \
  --add "subscription:id=sub_test123" \
  --add "subscription:status=canceled" \
  --add "subscription:current_period_end=1714503845" \
  --add "subscription:customer=cus_test123" \
  --add "customer:metadata.userId=user_123" \
  --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY"
```

### Invoice Events

```bash
# Test invoice payment succeeded
stripe trigger invoice.payment_succeeded \
  --add "invoice:subscription=sub_test123" \
  --add "invoice:customer=cus_test123" \
  --add "invoice:lines[0][price][id]=$PRICE_ID_MONTHLY"

# Test invoice payment failed
stripe trigger invoice.payment_failed \
  --add "invoice:subscription=sub_test123" \
  --add "invoice:customer=cus_test123" \
  --add "invoice:lines[0][price][id]=$PRICE_ID_MONTHLY"
```

### Checkout Events

```bash
# Test checkout session completed (regular subscription)
stripe trigger checkout.session.completed \
  --add "checkout_session:mode=subscription" \
  --add "checkout_session:subscription=sub_test123" \
  --add "checkout_session:metadata.userId=user_123" \
  --add "checkout_session:line_items[0][price][id]=$PRICE_ID_MONTHLY"

# Test checkout session completed (gift subscription)
stripe trigger checkout.session.completed \
  --add "checkout_session:mode=payment" \
  --add "checkout_session:metadata.isGift=true" \
  --add "checkout_session:metadata.recipientUserId=user_456" \
  --add "checkout_session:metadata.giftSenderName=John Doe" \
  --add "checkout_session:metadata.giftMessage=Enjoy!" \
  --add "checkout_session:metadata.giftDuration=monthly" \
  --add "checkout_session:metadata.giftQuantity=3" \
  --add "checkout_session:customer=cus_test123" \
  --add "checkout_session:line_items[0][price][id]=$PRICE_ID_MONTHLY"

# Test checkout session completed (lifetime purchase)
stripe trigger checkout.session.completed \
  --add "checkout_session:mode=payment" \
  --add "checkout_session:metadata.userId=user_123" \
  --add "checkout_session:customer=cus_test123" \
  --add "checkout_session:line_items[0][price][id]=$PRICE_ID_LIFETIME"

# Test checkout session completed (upgrade to lifetime)
stripe trigger checkout.session.completed \
  --add "checkout_session:mode=payment" \
  --add "checkout_session:metadata.userId=user_123" \
  --add "checkout_session:metadata.isUpgradeToLifetime=true" \
  --add "checkout_session:metadata.previousSubscriptionId=sub_test123" \
  --add "checkout_session:customer=cus_test123" \
  --add "checkout_session:line_items[0][price][id]=$PRICE_ID_LIFETIME"
```

### Charge Events

```bash
# Test charge succeeded
stripe trigger charge.succeeded \
  --add "charge:metadata.userId=user_123" \
  --add "charge:customer=cus_test123" \
  --add "charge:amount=9900"
```

### Customer Events

```bash
# Test customer deleted
stripe trigger customer.deleted \
  --add "customer:id=cus_test123" \
  --add "customer:metadata.userId=user_123"
```

## Testing Complete Flows

### Test Gift Subscription Flow

```bash
# 1. Create a checkout session for a gift
stripe trigger checkout.session.completed \
  --add "checkout_session:mode=payment" \
  --add "checkout_session:metadata.isGift=true" \
  --add "checkout_session:metadata.recipientUserId=user_456" \
  --add "checkout_session:metadata.giftSenderName=John Doe" \
  --add "checkout_session:metadata.giftMessage=Enjoy your gift!" \
  --add "checkout_session:metadata.giftDuration=monthly" \
  --add "checkout_session:metadata.giftQuantity=3" \
  --add "checkout_session:customer=cus_test123" \
  --add "checkout_session:amount_total=2900" \
  --add "checkout_session:currency=usd" \
  --add "checkout_session:line_items[0][price][id]=$PRICE_ID_MONTHLY"

# 2. Later, create a regular subscription for the same user
stripe trigger customer.subscription.created \
  --add "subscription:status=active" \
  --add "subscription:current_period_end=1714503845" \
  --add "subscription:customer=cus_test456" \
  --add "customer:metadata.userId=user_456" \
  --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
  --add "subscription:items[0][price][product]=prod_test123"
```

### Test Subscription Cancellation Flow

```bash
# 1. Create a subscription
stripe trigger customer.subscription.created \
  --add "subscription:status=active" \
  --add "subscription:id=sub_test123" \
  --add "subscription:current_period_end=1714503845" \
  --add "subscription:customer=cus_test123" \
  --add "customer:metadata.userId=user_123" \
  --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
  --add "subscription:items[0][price][product]=prod_test123"

# 2. Cancel the subscription
stripe trigger customer.subscription.deleted \
  --add "subscription:id=sub_test123" \
  --add "subscription:status=canceled" \
  --add "subscription:current_period_end=1714503845" \
  --add "subscription:customer=cus_test123" \
  --add "customer:metadata.userId=user_123" \
  --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY"
```

### Test Subscription + Gift Interaction

```bash
# 1. Create a subscription
stripe trigger customer.subscription.created \
  --add "subscription:status=active" \
  --add "subscription:id=sub_test123" \
  --add "subscription:current_period_end=1714503845" \
  --add "subscription:customer=cus_test123" \
  --add "customer:metadata.userId=user_123" \
  --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
  --add "subscription:items[0][price][product]=prod_test123"

# 2. Add a gift subscription that extends beyond the regular subscription
stripe trigger checkout.session.completed \
  --add "checkout_session:mode=payment" \
  --add "checkout_session:metadata.isGift=true" \
  --add "checkout_session:metadata.recipientUserId=user_123" \
  --add "checkout_session:metadata.giftDuration=annual" \
  --add "checkout_session:metadata.giftQuantity=1" \
  --add "checkout_session:customer=cus_test456" \
  --add "checkout_session:line_items[0][price][id]=$PRICE_ID_ANNUAL"

# 3. Trigger an invoice event to test pausing
stripe trigger invoice.payment_succeeded \
  --add "invoice:subscription=sub_test123" \
  --add "invoice:customer=cus_test123" \
  --add "invoice:status=open" \
  --add "invoice:lines[0][price][id]=$PRICE_ID_MONTHLY"
```
