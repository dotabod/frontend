#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
WEBHOOK_URL="http://localhost:3000/api/stripe/webhook"
USER_ID=""
PRICE_ID_MONTHLY="price_monthly123"
PRICE_ID_ANNUAL="price_annual123"
PRICE_ID_LIFETIME="price_lifetime123"

# Override with environment variables if available
[[ -n "$NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID" ]] && PRICE_ID_MONTHLY="$NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID"
[[ -n "$NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID" ]] && PRICE_ID_ANNUAL="$NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID"
[[ -n "$NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID" ]] && PRICE_ID_LIFETIME="$NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID"

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

# Ask for user ID if not provided
prompt_for_user_id() {
  read -p "Enter user ID (leave blank to use default: $USER_ID): " input_user_id
  if [[ -n "$input_user_id" ]]; then
    USER_ID="$input_user_id"
    echo "Using user ID: $USER_ID"
  fi
}

# Main menu
prompt_for_user_id

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
  echo "15. Change User ID"
  echo "0. Exit"

  read -p "Enter your choice: " choice
  echo

  case $choice in
  1)
    run_test "Subscription Created (Monthly)" "customer.subscription.created" \
      --override "subscription:items[0][price]=$PRICE_ID_MONTHLY" \
      --override "customer:metadata.userId=$USER_ID"
    ;;
  2)
    run_test "Subscription Created (Annual)" "customer.subscription.created" \
      --override "subscription:items[0][price]=$PRICE_ID_ANNUAL" \
      --override "customer:metadata.userId=$USER_ID"
    ;;
  3)
    run_test "Subscription Updated" "customer.subscription.updated" \
      --override "subscription:items[0][price]=$PRICE_ID_MONTHLY" \
      --override "customer:metadata.userId=$USER_ID"
    ;;
  4)
    run_test "Subscription Deleted" "customer.subscription.deleted" \
      --override "customer:metadata.userId=$USER_ID"
    ;;
  5)
    run_test "Invoice Payment Succeeded" "invoice.payment_succeeded" \
      --override "invoice:lines[0][price]=$PRICE_ID_MONTHLY" \
      --override "customer:metadata.userId=$USER_ID"
    ;;
  6)
    run_test "Invoice Payment Failed" "invoice.payment_failed" \
      --override "invoice:lines[0][price]=$PRICE_ID_MONTHLY" \
      --override "customer:metadata.userId=$USER_ID"
    ;;
  7)
    run_test "Checkout Session Completed (Regular Subscription)" "checkout.session.completed" \
      --override "checkout_session:mode=subscription" \
      --override "checkout_session:metadata.userId=$USER_ID" \
      --override "checkout_session:line_items[0][price]=$PRICE_ID_MONTHLY"
    ;;
  8)
    run_test "Checkout Session Completed (Gift Subscription)" "checkout.session.completed" \
      --override "checkout_session:mode=payment" \
      --override "checkout_session:metadata.isGift=true" \
      --override "checkout_session:metadata.recipientUserId=user_456" \
      --override "checkout_session:metadata.giftSenderName=John Doe" \
      --override "checkout_session:metadata.giftMessage=Enjoy!" \
      --override "checkout_session:metadata.giftDuration=monthly" \
      --override "checkout_session:metadata.giftQuantity=3" \
      --override "checkout_session:line_items[0][price]=$PRICE_ID_MONTHLY"
    ;;
  9)
    run_test "Checkout Session Completed (Lifetime Purchase)" "checkout.session.completed" \
      --override "checkout_session:mode=payment" \
      --override "checkout_session:metadata.userId=$USER_ID" \
      --override "checkout_session:line_items[0][price]=$PRICE_ID_LIFETIME"
    ;;
  10)
    run_test "Charge Succeeded" "charge.succeeded" \
      --override "charge:metadata.userId=$USER_ID" \
      --override "charge:amount=9900"
    ;;
  11)
    run_test "Customer Deleted" "customer.deleted" \
      --override "customer:metadata.userId=$USER_ID"
    ;;
  12)
    echo -e "${YELLOW}Running Complete Gift Subscription Flow${NC}"
    echo "Step 1: Create a checkout session for a gift"
    stripe trigger checkout.session.completed \
      --override "checkout_session:mode=payment" \
      --override "checkout_session:metadata.isGift=true" \
      --override "checkout_session:metadata.recipientUserId=user_456" \
      --override "checkout_session:metadata.giftSenderName=John Doe" \
      --override "checkout_session:metadata.giftMessage=Enjoy your gift!" \
      --override "checkout_session:metadata.giftDuration=monthly" \
      --override "checkout_session:metadata.giftQuantity=3" \
      --override "checkout_session:line_items[0][price]=$PRICE_ID_MONTHLY"

    echo "Press Enter to continue to step 2..."
    read

    echo "Step 2: Create a regular subscription for the same user"
    stripe trigger customer.subscription.created \
      --override "customer:metadata.userId=user_456" \
      --override "subscription:items[0][price]=$PRICE_ID_MONTHLY"

    echo "Press Enter to continue..."
    read
    ;;
  13)
    echo -e "${YELLOW}Running Complete Subscription Cancellation Flow${NC}"
    echo "Step 1: Create a subscription"
    stripe trigger customer.subscription.created \
      --override "customer:metadata.userId=$USER_ID" \
      --override "subscription:items[0][price]=$PRICE_ID_MONTHLY"

    echo "Press Enter to continue to step 2..."
    read

    echo "Step 2: Cancel the subscription"
    stripe trigger customer.subscription.deleted \
      --override "customer:metadata.userId=$USER_ID"

    echo "Press Enter to continue..."
    read
    ;;
  14)
    echo -e "${YELLOW}Running Subscription + Gift Interaction Test${NC}"
    echo "Step 1: Create a subscription"
    stripe trigger customer.subscription.created \
      --override "customer:metadata.userId=$USER_ID" \
      --override "subscription:items[0][price]=$PRICE_ID_MONTHLY"

    echo "Press Enter to continue to step 2..."
    read

    echo "Step 2: Add a gift subscription that extends beyond the regular subscription"
    stripe trigger checkout.session.completed \
      --override "checkout_session:mode=payment" \
      --override "checkout_session:metadata.isGift=true" \
      --override "checkout_session:metadata.recipientUserId=$USER_ID" \
      --override "checkout_session:metadata.giftDuration=annual" \
      --override "checkout_session:metadata.giftQuantity=1" \
      --override "checkout_session:line_items[0][price]=$PRICE_ID_ANNUAL"

    echo "Press Enter to continue to step 3..."
    read

    echo "Step 3: Trigger an invoice event to test pausing"
    stripe trigger invoice.payment_succeeded \
      --override "invoice:lines[0][price]=$PRICE_ID_MONTHLY" \
      --override "customer:metadata.userId=$USER_ID"

    echo "Press Enter to continue..."
    read
    ;;
  15)
    prompt_for_user_id
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
