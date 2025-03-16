Below is a detailed requirements document that scopes out the “Gift Subscription” feature for your existing Dotabod project. This document outlines the business objectives, user flows, technical integrations, data models, and non-functional requirements. You can use it as a guide for planning, development, and QA.

Gift Subscription Feature Requirements Document

1. Overview

Purpose:
Enable viewers to gift subscription time to streamers, extending the “Dotabod Pro” access period. Gifts can be one‑time or recurring and can vary in duration (e.g., one year, five months, monthly recurring gifts). The feature will integrate with Stripe for payment processing while the application will manage the effective “pro” access period via an expiration date in your backend.

Scope:
	•	Allow viewers to purchase gift subscriptions (one‑time and recurring) for streamers.
	•	Aggregate multiple gift durations (from different viewers) into a cumulative “pro” access expiration for the streamer.
	•	Maintain clear separation between Stripe billing (for recurring charges and gift payments) and internal access control (expiration date updates).
	•	Leverage existing Next.js API routes, Stripe Checkout, and webhooks, plus updates to the existing database (e.g., MongoDB) user schema.

⸻

2. Business Requirements
	•	Gifting Options:
	•	One‑Time Gift Purchase:
Viewers can gift a fixed period (e.g., 5 months, 12 months, or lifetime) to a streamer.
	•	Recurring Gift Subscription:
Viewers can subscribe to a recurring gift plan (e.g., monthly recurring charges) that automatically extends the streamer’s pro access period upon each successful payment.
	•	Aggregated Pro Access:
	•	Streamer’s “pro” access is extended by each gift. For example, if a streamer has an existing expiration date and receives a gift of 3 months, their access should extend by 3 months.
	•	If the streamer does not have an active pro subscription, the gifted period begins immediately (or from the time of processing).
	•	Billing Reliance:
Rely on Stripe to securely process payments (via Checkout sessions and subscriptions) while keeping minimal billing logic in your system.
	•	Transparency & Notifications:
Both the gifter and the streamer receive notifications upon a successful gift purchase and when the pro access period is updated.

⸻

3. Functional Requirements

3.1. User Flows

A. Viewer – One-Time Gift Flow
	•	Gift Initiation:
	•	Viewer selects “Gift a Sub” from the UI.
	•	Viewer chooses a gift duration (e.g., 5 months, 12 months, lifetime).
	•	Viewer enters recipient identifier (e.g., streamer username or ID).
	•	Payment Process:
	•	The application calls an API endpoint that creates a Stripe Checkout session.
	•	Custom metadata is attached (e.g., recipient ID, gift duration, gift type = one-time).
	•	Viewer completes the payment via Stripe.
	•	Post-Payment:
	•	Stripe sends a webhook (e.g., checkout.session.completed).
	•	Your API validates the event and extracts metadata.
	•	The system logs the gift transaction and updates the streamer’s pro access expiration date:
	•	If no active pro period exists, set the new expiration date to now + gifted duration.
	•	If an active pro period exists, add the gifted duration to the current expiration date.
	•	Notifications:
	•	Send confirmation emails/notifications to both the viewer and streamer.
	•	Update the streamer’s dashboard with the new expiration date and a breakdown of gift credits.

B. Viewer – Recurring Gift Flow
	•	Gift Initiation:
	•	Viewer selects “Gift a Recurring Sub” from the UI.
	•	Viewer chooses the recurring gift option (e.g., monthly recurring gift).
	•	Metadata includes recipient ID and fixed extension (e.g., each successful payment equals one month of extension).
	•	Payment Process:
	•	Create a recurring Stripe subscription for the viewer with appropriate metadata.
	•	Viewer’s card is charged monthly.
	•	On Each Payment Cycle:
	•	Listen for recurring webhook events (e.g., invoice.payment_succeeded).
	•	Upon each successful recurring payment:
	•	Validate and extract metadata.
	•	Update the streamer’s pro access expiration by adding the fixed period (e.g., one month) to the current expiration date.
	•	Log the recurring gift transaction.
	•	Notify both parties of the renewal and new expiration.

C. Aggregation & Expiration Management
	•	Cumulative Extension:
	•	Each gift, regardless of type, adds to the streamer’s pro access expiration.
	•	When a new gift is processed, calculate the new expiration as:
New Expiration = max(Current Expiration, Now) + Gift Duration
	•	Expiry & Cancellation:
	•	If a viewer’s recurring gift subscription is canceled or fails, future benefits are not applied after the current cycle ends.
	•	If there is a payment failure or if no gift payments are received, the streamer’s access should automatically lapse after the current expiration.

3.2. API & Webhook Requirements
	•	Checkout Session API:
	•	Endpoint to create Stripe Checkout sessions with gift metadata.
	•	Validate authenticated viewer requests.
	•	Webhook Endpoints:
	•	Create secure webhook endpoints (e.g., for checkout.session.completed and invoice.payment_succeeded).
	•	Validate Stripe’s signatures.
	•	Process events to update streamer records.
	•	Subscription Update API:
	•	If recurring gifts are used, provide endpoints to update viewer’s recurring subscription if needed (for cancellations, etc.).

3.3. Database Requirements
	•	User (Streamer) Schema:
	•	Add/modify a field (e.g., proExpirationDate) to track the active pro access period.
	•	Optionally log a history of gift transactions (could be in a separate “GiftTransactions” collection) with fields:
	•	recipientId
	•	gifterId
	•	giftType (one-time vs. recurring)
	•	giftDuration
	•	timestamp
	•	stripeTransactionId
	•	Logging & Auditing:
	•	Maintain audit logs for successful gift processing to support troubleshooting and customer support.

3.4. Notifications & UI Updates
	•	Email Notifications:
	•	Trigger emails to both the viewer (confirmation) and streamer (notification of gifted pro access and updated expiration date).
	•	Dashboard Updates:
	•	Streamer dashboard should display:
	•	Current “pro” access expiration date.
	•	Breakdown of accumulated gift durations.
	•	Optionally, a history or summary of received gift transactions.

⸻

4. Non-Functional Requirements
	•	Security:
	•	All sensitive operations (e.g., creating checkout sessions, processing webhooks) must be performed on secure server‑side endpoints.
	•	Use HTTPS and validate Stripe webhook signatures.
	•	Ensure metadata is not tampered with on the client side.
	•	Scalability:
	•	Use serverless or scalable Next.js API routes to handle high webhook event volume.
	•	Database updates for expiration dates must be atomic and idempotent (prevent duplicate processing).
	•	Reliability & Fault Tolerance:
	•	Implement retry logic for webhook processing.
	•	Maintain an audit log to detect and resolve any discrepancies (e.g., duplicate events).
	•	Performance:
	•	Updates to the user’s expiration date should be efficient (e.g., using indexed fields in the database).
	•	The UI should refresh to reflect changes without noticeable delay.
	•	Maintainability:
	•	Keep business logic for “pro” access extension separate from billing logic.
	•	Document API endpoints, database schema changes, and processing logic.
	•	Write comprehensive tests for webhook handlers and expiration updates.

⸻

5. Dependencies & Integration Points
	•	Stripe Billing & Checkout:
	•	Leverage Stripe’s API for payment processing.
	•	Configure products/prices for one‑time and recurring gift subscriptions.
	•	Next.js API Routes:
	•	Create secure endpoints for session creation, webhook processing, and subscription updates.
	•	Database (MongoDB):
	•	Update user schema and possibly create a separate collection for gift transaction logs.
	•	Email/Notification Service:
	•	Integrate with an email service (or in-app notification system) to send confirmations and alerts.

⸻

6. Testing & Quality Assurance
	•	Unit Tests:
	•	Test API endpoints that create checkout sessions.
	•	Test webhook processing logic for both one‑time and recurring gift events.
	•	Integration Tests:
	•	Simulate Stripe events (using Stripe’s test mode) to ensure correct updating of expiration dates.
	•	Verify that cumulative gift durations are correctly aggregated.
	•	User Acceptance Testing (UAT):
	•	Validate that viewers can easily gift subscriptions.
	•	Confirm that streamers see the correct pro access status and expiration dates.
	•	Performance Testing:
	•	Stress test webhook endpoints to ensure no duplicate processing under load.

⸻

7. Timeline & Milestones
	•	Phase 1 – Design & API Definition:
Draft API endpoints, database schema changes, and integration details (1–2 weeks).
	•	Phase 2 – Implementation:
Develop Next.js API routes, integrate with Stripe Checkout, implement webhook endpoints, update database, and build UI notifications (3–4 weeks).
	•	Phase 3 – Testing & QA:
Unit, integration, and UAT testing; simulate various gift scenarios (1–2 weeks).
	•	Phase 4 – Deployment & Monitoring:
Deploy feature, set up monitoring (Stripe dashboards, logging), and prepare rollback plan if necessary (1 week).

⸻

8. Open Issues / Considerations
	•	Error Handling:
How to handle cases where a Stripe webhook event fails (e.g., due to downtime) to avoid missing gift credit updates.
	•	Reconciliation:
Ensure that any duplicate events (or missed events) can be reconciled using an audit log.
	•	Edge Cases:
	•	How to handle overlapping gifts (e.g., if a gift is received right before expiration).
	•	Policy for lifetime gifts overriding recurring ones.
	•	User Communication:
Clearly document in your terms that gifted credits extend access but are not refundable.

⸻

This requirements document should serve as a comprehensive scope for adding the gift subscription feature to your existing project. It details the business logic, user flows, technical integration, and testing strategy to ensure a smooth rollout of the feature.

Below is an additional section for the requirements document that details edge cases and scenarios you need to consider when implementing the gift subscription feature.

⸻

9. Edge Cases & Scenario Analysis

A. Duplicate or Out‑of‑Order Webhook Events
	•	Duplicate Events:
	•	Scenario: A Stripe webhook event (e.g., invoice.payment_succeeded) is received multiple times.
	•	Mitigation:
	•	Implement idempotency by recording unique Stripe event or transaction IDs in your audit log.
	•	Ensure that if a gift event has already been processed, subsequent duplicate events are ignored.
	•	Out-of-Order Events:
	•	Scenario: A webhook event that should extend a subscription (gift payment) arrives after a subsequent gift has already updated the expiration.
	•	Mitigation:
	•	Always compute the new expiration as max(currentExpiration, now) + giftDuration so that even if events are processed out of order, you never reduce the expiration.
	•	Log timestamps to reconcile events if needed.

B. Payment Failures and Cancellations
	•	One-Time Gift Payment Failure:
	•	Scenario: The payment is initiated but fails or is canceled before completion.
	•	Mitigation:
	•	Ensure that your webhook validation only updates the expiration if the payment status is “paid.”
	•	In the event of a failure, send an alert to the viewer with instructions for reattempting the purchase.
	•	Recurring Gift Payment Failure or Cancellation:
	•	Scenario: A recurring gift subscription payment fails (or the viewer cancels) mid-cycle.
	•	Mitigation:
	•	Process the current cycle normally if the payment succeeded; stop extending the pro period for future cycles.
	•	If a payment fails, notify the viewer and trigger your recovery or retry mechanism (using Stripe’s smart retry or manual intervention).
	•	If the subscription is canceled, ensure no future extensions are applied after the current cycle ends.

C. Multiple Gifts and Overlapping Durations
	•	Cumulative Gift Extensions:
	•	Scenario: A streamer receives multiple gifts from different viewers simultaneously (or in quick succession).
	•	Mitigation:
	•	Always calculate the new expiration date as:
New Expiration = max(currentExpiration, now) + giftDuration
	•	Use transactional database updates (or atomic operations) to ensure that concurrent updates do not cause race conditions.
	•	Gifts When Already Pro:
	•	Scenario: A streamer already has an active pro period from a direct subscription or previous gifts, and a new gift is processed.
	•	Mitigation:
	•	Simply add the new gift duration to the later of the current expiration or “now.”
	•	For lifetime gifts, override any expiration date.

D. Metadata and Data Consistency Issues
	•	Missing or Corrupt Metadata:
	•	Scenario: A webhook event arrives without the required metadata (e.g., recipientId or giftDuration).
	•	Mitigation:
	•	Validate all required metadata upon receipt.
	•	Log errors and notify your support team for manual review.
	•	Optionally, implement a fallback procedure (e.g., holding the gift in a pending state) until the issue is resolved.
	•	Recipient Not Found:
	•	Scenario: The recipient identifier provided in the metadata does not match any streamer in your database.
	•	Mitigation:
	•	Log such events and optionally trigger an automated alert to your support team.
	•	Decide on a policy: either refund the payment or hold it until the recipient account can be linked (e.g., via account linking or manual intervention).

E. System Integration and Reconciliation
	•	Database Update Failures:
	•	Scenario: The process to update the streamer’s proExpirationDate fails due to a database error or network issue.
	•	Mitigation:
	•	Ensure that the update process is wrapped in error handling and logged for manual intervention.
	•	Consider scheduling periodic reconciliation jobs to compare Stripe’s transaction logs with your internal records.
	•	Concurrent Modification Conflicts:
	•	Scenario: Multiple gift transactions (or simultaneous webhook events) try to update the proExpirationDate at the same time.
	•	Mitigation:
	•	Use atomic updates or transactions in your database.
	•	Implement optimistic or pessimistic locking to prevent race conditions.

F. Special Scenarios
	•	Lifetime Gifts:
	•	Scenario: A gift purchase designates “lifetime” pro access.
	•	Mitigation:
	•	When processing a lifetime gift, set a special flag on the streamer’s record that overrides the expiration date (or set a date far in the future).
	•	Ensure that subsequent recurring gift payments or direct subscriptions do not conflict with the lifetime status.
	•	Gifter/Recipient Edge Cases:
	•	Scenario: The viewer gifting the subscription later disputes the charge or requests a refund.
	•	Mitigation:
	•	Clearly communicate in the terms of service that gifted pro access is non-refundable.
	•	Log and document gift transactions so that, in case of disputes, you can manually verify that the gift was successfully processed.
	•	Grace Periods and Renewal Overlap:
	•	Scenario: A recurring gift is processed very close to the end of the current billing period.
	•	Mitigation:
	•	Decide whether the new gift should be applied immediately (extending from “now”) or to the end of the current period. Typically, using the formula above (max(currentExpiration, now) + giftDuration) covers both cases.
	•	Communicate clearly to streamers how and when extensions are applied.

⸻

10. Summary

This section outlines the key edge cases and various scenarios—ranging from duplicate webhook events and payment failures to multiple gift aggregation and metadata issues—that must be handled for a robust gift subscription implementation. Addressing these concerns during the design phase will ensure your system is resilient, accurate, and user‑friendly.
