#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
WEBHOOK_URL="http://localhost:3000/api/stripe/webhook"
USER_ID="d8fb664f-74b6-485c-a277-4423ee179eeb"
PRICE_ID_MONTHLY="price_monthly123"
PRICE_ID_ANNUAL="price_annual123"
PRICE_ID_LIFETIME="price_lifetime123"

# Grace period end date from subscription.ts
GRACE_PERIOD_END="2025-02-01T00:00:00.000Z"

# Override with environment variables if available
[[ -n "$NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID" ]] && PRICE_ID_MONTHLY="$NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID"
[[ -n "$NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID" ]] && PRICE_ID_ANNUAL="$NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID"
[[ -n "$NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID" ]] && PRICE_ID_LIFETIME="$NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID"
# Gift price IDs
GIFT_PRICE_ID_MONTHLY="price_gift_monthly123"

# Override with environment variables if available
[[ -n "$NEXT_PUBLIC_STRIPE_CREDIT_PRICE_ID" ]] && GIFT_PRICE_ID_MONTHLY="$NEXT_PUBLIC_STRIPE_CREDIT_PRICE_ID"

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

# Function to delete all customers
delete_all_customers() {
  echo -e "${YELLOW}Deleting all customers in your Stripe account...${NC}"
  echo "This will delete ALL customers in your Stripe test mode account."

  echo "Fetching customers..."
  customers=$(stripe customers list --limit 100)

  if [[ -z "$customers" ]]; then
    echo "No customers found."
    return
  fi

  customer_ids=$(echo "$customers" | grep -o '"id": "[^"]*"' | cut -d'"' -f4)

  if [[ -z "$customer_ids" ]]; then
    echo "No customer IDs found."
    return
  fi

  count=0
  for id in $customer_ids; do
    echo "Deleting customer $id..."
    stripe customers delete "$id" --confirm
    ((count++))
  done

  echo -e "${GREEN}Deleted $count customers.${NC}"
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
  echo "16. Delete All Customers"
  echo "17. Trial Subscription Created"
  echo "18. Grace Period Subscription"
  echo "19. Test Multiple Gift Subscriptions"
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
      --override "checkout_session:metadata.recipientUserId=$USER_ID" \
      --override "checkout_session:metadata.giftSenderName=John Doe" \
      --override "checkout_session:metadata.giftMessage=Enjoy!" \
      --override "checkout_session:metadata.giftDuration=monthly" \
      --override "checkout_session:metadata.giftQuantity=3" \
      --override "checkout_session:line_items[0][price]=$GIFT_PRICE_ID_MONTHLY"
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
    echo "running for price id: $GIFT_PRICE_ID_MONTHLY"
    echo "Step 1: Create a checkout session for a gift"
    stripe trigger checkout.session.completed \
      --add "checkout_session:mode=payment" \
      --add "checkout_session:metadata.isGift=true" \
      --add "checkout_session:metadata.recipientUserId=$USER_ID" \
      --add "checkout_session:metadata.giftSenderName=John Doe" \
      --add "checkout_session:metadata.giftMessage=Enjoy your gift!" \
      --add "checkout_session:metadata.giftDuration=monthly" \
      --add "checkout_session:metadata.giftQuantity=5" \
      --add "checkout_session:line_items[0][price]=$GIFT_PRICE_ID_MONTHLY" \
      --add "checkout_session:line_items[0][quantity]=5"

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
      --override "checkout_session:metadata.giftDuration=monthly" \
      --override "checkout_session:metadata.giftQuantity=12" \
      --override "checkout_session:line_items[0][price]=$GIFT_PRICE_ID_MONTHLY" \
      --override "checkout_session:currency=usd" \
      --override "checkout_session:metadata.amount=3000"

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
  16)
    delete_all_customers
    ;;
  17)
    run_test "Trial Subscription Created" "customer.subscription.created" \
      --override "subscription:items[0][price]=$PRICE_ID_MONTHLY" \
      --override "subscription:trial_period_days=14" \
      --override "customer:metadata.userId=$USER_ID"

    echo -e "${GREEN}Created a trial subscription that will end in 14 days${NC}"
    ;;
  18)
    # Calculate days until grace period ends
    # Parse the grace period end date
    GRACE_YEAR=$(echo $GRACE_PERIOD_END | cut -d'-' -f1)
    GRACE_MONTH=$(echo $GRACE_PERIOD_END | cut -d'-' -f2)
    GRACE_DAY=$(echo $GRACE_PERIOD_END | cut -d'-' -f3 | cut -dT -f1)

    # Get current date components
    CURRENT_YEAR=$(date +%Y)
    CURRENT_MONTH=$(date +%m)
    CURRENT_DAY=$(date +%d)

    # Calculate rough estimate of days (this is approximate)
    DAYS_IN_YEAR=365
    GRACE_TOTAL_DAYS=$((GRACE_YEAR * DAYS_IN_YEAR + GRACE_MONTH * 30 + GRACE_DAY))
    CURRENT_TOTAL_DAYS=$((CURRENT_YEAR * DAYS_IN_YEAR + CURRENT_MONTH * 30 + CURRENT_DAY))
    DAYS_UNTIL_GRACE_END=$((GRACE_TOTAL_DAYS - CURRENT_TOTAL_DAYS))

    # Ensure positive value
    if [ $DAYS_UNTIL_GRACE_END -lt 0 ]; then
      DAYS_UNTIL_GRACE_END=14
    fi

    echo -e "${YELLOW}Days remaining until grace period ends (April 30, 2025): $DAYS_UNTIL_GRACE_END${NC}"

    run_test "Grace Period Subscription" "customer.subscription.created" \
      --override "subscription:items[0][price]=$PRICE_ID_MONTHLY" \
      --override "subscription:trial_period_days=$DAYS_UNTIL_GRACE_END" \
      --override "subscription:cancel_at_period_end=false" \
      --override "customer:metadata.userId=$USER_ID" \
      --override "customer:metadata.isGracePeriodVirtual=true"

    echo -e "${GREEN}Created a grace period subscription with $DAYS_UNTIL_GRACE_END days trial period${NC}"
    echo -e "${YELLOW}Note: This simulates the virtual subscription created during the grace period${NC}"
    ;;
  19)
    echo -e "${YELLOW}Testing Multiple Gift Subscriptions${NC}"
    echo "This test will create multiple gift subscriptions for the same user to test gift accumulation"

    echo "Step 1: Create a regular subscription"
    stripe trigger customer.subscription.created \
      --override "customer:metadata.userId=$USER_ID" \
      --override "subscription:items[0][price]=$PRICE_ID_MONTHLY"

    echo "Press Enter to continue to step 2..."
    read

    echo "Step 2: Create first gift subscription (3 months)"
    stripe trigger checkout.session.completed \
      --override "checkout_session:mode=payment" \
      --override "checkout_session:metadata.isGift=true" \
      --override "checkout_session:metadata.recipientUserId=$USER_ID" \
      --override "checkout_session:metadata.giftSenderName=First Gifter" \
      --override "checkout_session:metadata.giftMessage=First gift!" \
      --override "checkout_session:metadata.giftDuration=monthly" \
      --override "checkout_session:metadata.giftQuantity=3" \
      --override "checkout_session:line_items[0][price]=$GIFT_PRICE_ID_MONTHLY" \
      --override "checkout_session:currency=usd"

    echo "Press Enter to continue to step 3..."
    read

    echo "Step 3: Create second gift subscription (2 months)"
    stripe trigger checkout.session.completed \
      --override "checkout_session:mode=payment" \
      --override "checkout_session:metadata.isGift=true" \
      --override "checkout_session:metadata.recipientUserId=$USER_ID" \
      --override "checkout_session:metadata.giftSenderName=Second Gifter" \
      --override "checkout_session:metadata.giftMessage=Second gift!" \
      --override "checkout_session:metadata.giftDuration=monthly" \
      --override "checkout_session:metadata.giftQuantity=2" \
      --override "checkout_session:line_items[0][price]=$GIFT_PRICE_ID_MONTHLY" \
      --override "checkout_session:currency=usd"

    echo "Press Enter to continue to step 4..."
    read

    echo "Step 4: Create third gift subscription (4 months)"
    stripe trigger checkout.session.completed \
      --override "checkout_session:mode=payment" \
      --override "checkout_session:metadata.isGift=true" \
      --override "checkout_session:metadata.recipientUserId=$USER_ID" \
      --override "checkout_session:metadata.giftSenderName=Third Gifter" \
      --override "checkout_session:metadata.giftMessage=Third gift!" \
      --override "checkout_session:metadata.giftDuration=monthly" \
      --override "checkout_session:metadata.giftQuantity=4" \
      --override "checkout_session:line_items[0][price]=$GIFT_PRICE_ID_MONTHLY" \
      --override "checkout_session:currency=usd"

    echo -e "${GREEN}Created 3 gift subscriptions totaling 9 months${NC}"
    echo -e "${YELLOW}Check the database to verify all gift subscriptions have the same end date${NC}"
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
