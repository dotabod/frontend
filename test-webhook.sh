#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
WEBHOOK_URL="http://localhost:3000/api/stripe/webhook"
USER_ID="user_123"
CUSTOMER_ID="cus_test123"
SUBSCRIPTION_ID="sub_test123"
PRICE_ID_MONTHLY="${NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID:-price_monthly123}"
PRICE_ID_ANNUAL="${NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID:-price_annual123}"
PRICE_ID_LIFETIME="${NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID:-price_lifetime123}"

# Print header
echo -e "${GREEN}Stripe Webhook Testing Script${NC}"
echo "This script helps test the Stripe webhook handler with common scenarios."
echo

# Function to run a test
run_test() {
  local test_name=$1
  local event_type=$2
  shift 2
  local params=("$@")

  echo -e "${YELLOW}Running test: ${test_name}${NC}"
  echo "Event: $event_type"
  echo "Command: stripe trigger $event_type ${params[*]}"
  echo

  # Execute the command
  stripe trigger "$event_type" "${params[@]}"

  echo
  echo "Press Enter to continue to the next test..."
  read
  echo
}

# Main menu
while true; do
  echo "Select a test to run:"
  echo "1. Subscription Created (Monthly)"
  echo "2. Subscription Created (Annual)"
  echo "3. Subscription Updated"
  echo "4. Subscription Deleted"
  echo "5. Invoice Payment Succeeded"
  echo "6. Invoice Payment Failed"
  echo "7. Checkout Session Completed (Regular Subscription)"
  echo "8. Checkout Session Completed (Gift Subscription)"
  echo "9. Checkout Session Completed (Lifetime Purchase)"
  echo "10. Charge Succeeded"
  echo "11. Customer Deleted"
  echo "12. Complete Gift Subscription Flow"
  echo "13. Complete Subscription Cancellation Flow"
  echo "14. Test Subscription + Gift Interaction"
  echo "0. Exit"

  read -p "Enter your choice: " choice
  echo

  case $choice in
  1)
    run_test "Subscription Created (Monthly)" "customer.subscription.created" \
      --add "subscription:status=active" \
      --add "subscription:current_period_end=1714503845" \
      --add "subscription:customer=$CUSTOMER_ID" \
      --add "customer:metadata.userId=$USER_ID" \
      --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
      --add "subscription:items[0][price][product]=prod_test123"
    ;;
  2)
    run_test "Subscription Created (Annual)" "customer.subscription.created" \
      --add "subscription:status=active" \
      --add "subscription:current_period_end=1746039845" \
      --add "subscription:customer=$CUSTOMER_ID" \
      --add "customer:metadata.userId=$USER_ID" \
      --add "subscription:items[0][price][id]=$PRICE_ID_ANNUAL" \
      --add "subscription:items[0][price][product]=prod_test123"
    ;;
  3)
    run_test "Subscription Updated" "customer.subscription.updated" \
      --add "subscription:status=active" \
      --add "subscription:current_period_end=1714503845" \
      --add "subscription:customer=$CUSTOMER_ID" \
      --add "customer:metadata.userId=$USER_ID" \
      --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
      --add "subscription:items[0][price][product]=prod_test123"
    ;;
  4)
    run_test "Subscription Deleted" "customer.subscription.deleted" \
      --add "subscription:id=$SUBSCRIPTION_ID" \
      --add "subscription:status=canceled" \
      --add "subscription:current_period_end=1714503845" \
      --add "subscription:customer=$CUSTOMER_ID" \
      --add "customer:metadata.userId=$USER_ID" \
      --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY"
    ;;
  5)
    run_test "Invoice Payment Succeeded" "invoice.payment_succeeded" \
      --add "invoice:subscription=$SUBSCRIPTION_ID" \
      --add "invoice:customer=$CUSTOMER_ID" \
      --add "invoice:lines[0][price][id]=$PRICE_ID_MONTHLY"
    ;;
  6)
    run_test "Invoice Payment Failed" "invoice.payment_failed" \
      --add "invoice:subscription=$SUBSCRIPTION_ID" \
      --add "invoice:customer=$CUSTOMER_ID" \
      --add "invoice:lines[0][price][id]=$PRICE_ID_MONTHLY"
    ;;
  7)
    run_test "Checkout Session Completed (Regular Subscription)" "checkout.session.completed" \
      --add "checkout_session:mode=subscription" \
      --add "checkout_session:subscription=$SUBSCRIPTION_ID" \
      --add "checkout_session:metadata.userId=$USER_ID" \
      --add "checkout_session:line_items[0][price][id]=$PRICE_ID_MONTHLY"
    ;;
  8)
    run_test "Checkout Session Completed (Gift Subscription)" "checkout.session.completed" \
      --add "checkout_session:mode=payment" \
      --add "checkout_session:metadata.isGift=true" \
      --add "checkout_session:metadata.recipientUserId=user_456" \
      --add "checkout_session:metadata.giftSenderName=John Doe" \
      --add "checkout_session:metadata.giftMessage=Enjoy!" \
      --add "checkout_session:metadata.giftDuration=monthly" \
      --add "checkout_session:metadata.giftQuantity=3" \
      --add "checkout_session:customer=$CUSTOMER_ID" \
      --add "checkout_session:line_items[0][price][id]=$PRICE_ID_MONTHLY"
    ;;
  9)
    run_test "Checkout Session Completed (Lifetime Purchase)" "checkout.session.completed" \
      --add "checkout_session:mode=payment" \
      --add "checkout_session:metadata.userId=$USER_ID" \
      --add "checkout_session:customer=$CUSTOMER_ID" \
      --add "checkout_session:line_items[0][price][id]=$PRICE_ID_LIFETIME"
    ;;
  10)
    run_test "Charge Succeeded" "charge.succeeded" \
      --add "charge:metadata.userId=$USER_ID" \
      --add "charge:customer=$CUSTOMER_ID" \
      --add "charge:amount=9900"
    ;;
  11)
    run_test "Customer Deleted" "customer.deleted" \
      --add "customer:id=$CUSTOMER_ID" \
      --add "customer:metadata.userId=$USER_ID"
    ;;
  12)
    echo -e "${YELLOW}Running Complete Gift Subscription Flow${NC}"
    echo "Step 1: Create a checkout session for a gift"
    stripe trigger checkout.session.completed \
      --add "checkout_session:mode=payment" \
      --add "checkout_session:metadata.isGift=true" \
      --add "checkout_session:metadata.recipientUserId=user_456" \
      --add "checkout_session:metadata.giftSenderName=John Doe" \
      --add "checkout_session:metadata.giftMessage=Enjoy your gift!" \
      --add "checkout_session:metadata.giftDuration=monthly" \
      --add "checkout_session:metadata.giftQuantity=3" \
      --add "checkout_session:customer=$CUSTOMER_ID" \
      --add "checkout_session:amount_total=2900" \
      --add "checkout_session:currency=usd" \
      --add "checkout_session:line_items[0][price][id]=$PRICE_ID_MONTHLY"

    echo "Press Enter to continue to step 2..."
    read

    echo "Step 2: Create a regular subscription for the same user"
    stripe trigger customer.subscription.created \
      --add "subscription:status=active" \
      --add "subscription:current_period_end=1714503845" \
      --add "subscription:customer=cus_test456" \
      --add "customer:metadata.userId=user_456" \
      --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
      --add "subscription:items[0][price][product]=prod_test123"

    echo "Press Enter to continue..."
    read
    ;;
  13)
    echo -e "${YELLOW}Running Complete Subscription Cancellation Flow${NC}"
    echo "Step 1: Create a subscription"
    stripe trigger customer.subscription.created \
      --add "subscription:status=active" \
      --add "subscription:id=$SUBSCRIPTION_ID" \
      --add "subscription:current_period_end=1714503845" \
      --add "subscription:customer=$CUSTOMER_ID" \
      --add "customer:metadata.userId=$USER_ID" \
      --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
      --add "subscription:items[0][price][product]=prod_test123"

    echo "Press Enter to continue to step 2..."
    read

    echo "Step 2: Cancel the subscription"
    stripe trigger customer.subscription.deleted \
      --add "subscription:id=$SUBSCRIPTION_ID" \
      --add "subscription:status=canceled" \
      --add "subscription:current_period_end=1714503845" \
      --add "subscription:customer=$CUSTOMER_ID" \
      --add "customer:metadata.userId=$USER_ID" \
      --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY"

    echo "Press Enter to continue..."
    read
    ;;
  14)
    echo -e "${YELLOW}Running Subscription + Gift Interaction Test${NC}"
    echo "Step 1: Create a subscription"
    stripe trigger customer.subscription.created \
      --add "subscription:status=active" \
      --add "subscription:id=$SUBSCRIPTION_ID" \
      --add "subscription:current_period_end=1714503845" \
      --add "subscription:customer=$CUSTOMER_ID" \
      --add "customer:metadata.userId=$USER_ID" \
      --add "subscription:items[0][price][id]=$PRICE_ID_MONTHLY" \
      --add "subscription:items[0][price][product]=prod_test123"

    echo "Press Enter to continue to step 2..."
    read

    echo "Step 2: Add a gift subscription that extends beyond the regular subscription"
    stripe trigger checkout.session.completed \
      --add "checkout_session:mode=payment" \
      --add "checkout_session:metadata.isGift=true" \
      --add "checkout_session:metadata.recipientUserId=$USER_ID" \
      --add "checkout_session:metadata.giftDuration=annual" \
      --add "checkout_session:metadata.giftQuantity=1" \
      --add "checkout_session:customer=cus_test456" \
      --add "checkout_session:line_items[0][price][id]=$PRICE_ID_ANNUAL"

    echo "Press Enter to continue to step 3..."
    read

    echo "Step 3: Trigger an invoice event to test pausing"
    stripe trigger invoice.payment_succeeded \
      --add "invoice:subscription=$SUBSCRIPTION_ID" \
      --add "invoice:customer=$CUSTOMER_ID" \
      --add "invoice:status=open" \
      --add "invoice:lines[0][price][id]=$PRICE_ID_MONTHLY"

    echo "Press Enter to continue..."
    read
    ;;
  0)
    echo "Exiting..."
    exit 0
    ;;
  *)
    echo "Invalid choice. Please try again."
    ;;
  esac
done
