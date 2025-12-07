#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}Stripe Webhook Migration Script${NC}"
echo "This script helps migrate from the old webhook handler to the new one."
echo

# Check if the new webhook file exists
if [ ! -f "src/pages/api/stripe/webhook.ts.new" ]; then
  echo -e "${RED}Error: src/pages/api/stripe/webhook.ts.new not found${NC}"
  echo "Make sure you have created the new webhook handler before running this script."
  exit 1
fi

# Function to backup the old webhook handler
backup_old_handler() {
  echo -e "${YELLOW}Backing up the old webhook handler...${NC}"

  # Create a backup directory if it doesn't exist
  mkdir -p src/pages/api/stripe/backup

  # Backup the old webhook handler
  cp src/pages/api/stripe/webhook.ts src/pages/api/stripe/backup/webhook.ts.bak

  echo "Old webhook handler backed up to src/pages/api/stripe/backup/webhook.ts.bak"
  echo
}

# Function to deploy the new webhook handler
deploy_new_handler() {
  echo -e "${YELLOW}Deploying the new webhook handler...${NC}"

  # Rename the new webhook handler to replace the old one
  mv src/pages/api/stripe/webhook.ts.new src/pages/api/stripe/webhook.ts

  echo "New webhook handler deployed to src/pages/api/stripe/webhook.ts"
  echo
}

# Function to run tests
run_tests() {
  echo -e "${YELLOW}Running tests...${NC}"

  # Check if the test script exists
  if [ ! -f "test-webhook.sh" ]; then
    echo -e "${RED}Error: test-webhook.sh not found${NC}"
    echo "Make sure you have created the test script before running this function."
    return 1
  fi

  # Make sure the test script is executable
  chmod +x test-webhook.sh

  # Run the test script
  ./test-webhook.sh

  echo "Tests completed."
  echo
}

# Function to rollback to the old webhook handler
rollback() {
  echo -e "${YELLOW}Rolling back to the old webhook handler...${NC}"

  # Check if the backup exists
  if [ ! -f "src/pages/api/stripe/backup/webhook.ts.bak" ]; then
    echo -e "${RED}Error: Backup file not found${NC}"
    echo "Cannot rollback without a backup file."
    return 1
  fi

  # Restore the old webhook handler
  cp src/pages/api/stripe/backup/webhook.ts.bak src/pages/api/stripe/webhook.ts

  echo "Rolled back to the old webhook handler."
  echo
}

# Main menu
while true; do
  echo "Select an action:"
  echo "1. Backup the old webhook handler"
  echo "2. Deploy the new webhook handler"
  echo "3. Run tests"
  echo "4. Rollback to the old webhook handler"
  echo "5. Full migration (backup, deploy, test)"
  echo "0. Exit"

  read -p "Enter your choice: " choice
  echo

  case $choice in
  1)
    backup_old_handler
    ;;
  2)
    deploy_new_handler
    ;;
  3)
    run_tests
    ;;
  4)
    rollback
    ;;
  5)
    backup_old_handler
    deploy_new_handler
    run_tests

    read -p "Did the tests pass? (y/n): " tests_passed
    if [ "$tests_passed" != "y" ]; then
      echo -e "${RED}Tests failed. Rolling back...${NC}"
      rollback
    else
      echo -e "${GREEN}Migration completed successfully!${NC}"
    fi
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
