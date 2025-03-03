---
title: When Innovation Goes Wrong
description: How a New Feature Led to Losing 6,000 Dotabod Users
date: 2024-10-14
author: Dotabod Team
---

## Our Mission and Recent Setback

At Dotabod, our mission has always been to provide gamers with seamless, reliable tools to enhance their Dota 2 experience — all for free. Recently, we faced a significant setback that impacted over **6,000** of our valued users. In this article, I want to transparently share what happened, the lessons we learned, and the steps we're taking to ensure such an incident never occurs again.

## Introducing the Moderator Access Feature

We're thrilled to announce our latest feature: **Moderator Access**. This functionality empowers your channel's moderators to manage your Dotabod settings seamlessly.

**Security First:** Rest assured, moderators cannot view your authentication token or access the setup page. These sensitive areas remain private, visible only to you, the streamer. This ensures that while moderators can assist with settings, your personal credentials and sensitive configurations remain secure.

We believe this feature will streamline the management of your Dotabod account, allowing you to focus more on your gameplay and community engagement.

## The Unfortunate Incident: A Costly Mistake

While implementing the Moderator Access feature, we needed to make a crucial update to our database schema. Specifically, we aimed to enhance data integrity by changing the `moderatorChannelId` field in our `approved_moderators` table from a string to a number. Since channel IDs in Twitch are inherently numeric, this change was intended to enforce better data sanity and reliability.

However, during this Prisma schema migration, an unexpected error occurred:

⚠️ **We found changes that cannot be executed:**

- Changed the type of `moderatorChannelId` on the `approved_moderators` table. No cast exists, the column would be dropped and recreated, which cannot be done since the column is required and there is data in the table.
- × To apply this change we need to reset the database, do you want to continue? All data will be lost. ... **Yes**

Misinterpreting this prompt, I believed that resetting the database would only affect the new `approved_moderators` table. Tragically, this action resulted in the complete wipe of our entire database. Consequently, approximately **6,000 users** lost their accounts, along with their Dotabod preferences, linked Steam accounts, and Twitch authentication tokens. This meant that all personalized settings, game data, and authentication tokens were irretrievably lost.

## Why We Didn't Have Backups

In hindsight, having robust backup systems in place would have mitigated this disaster. Unfortunately, maintaining backups incurs significant costs, and without sufficient donations or revenue to support these expenses, we had to make tough choices. As a small team, the financial strain made it unfeasible to enable comprehensive backups on our server.

**Dotabod is Free:** We are committed to keeping Dotabod free for all users. To sustain and improve our services, we rely on the generosity of our community. If you appreciate what we do and wish to support us, you can donate through the following links:

- [GitHub Sponsors](https://github.com/sponsors/dotabod)
- [Ko-fi](https://ko-fi.com/dotabod)
- [Boosty](https://boosty.to/dotabod)

Your contributions help us cover essential costs, including implementing reliable backup systems to protect your data.

## Recovery: Restoring from an April 2024 Backup

Despite the extensive data loss, there was a silver lining. I discovered a backup from **April 2024**, which allowed us to restore a significant portion of our data. While this brought us back to a previous state, it meant that users who interacted with Dotabod after April 2024 needed to re-establish their accounts and preferences.

## Impact on Users and How to Fix It

If you're one of the affected users, you may notice several issues with your Dotabod experience:

- **Dotabod Probably Won't Work:** Essential features may be non-functional.
- **Wins and Losses Calculated Incorrectly:** Your game statistics may not display accurately.
- **Overlay Indicates Your Stream Is Offline:** The overlay might show incorrect streaming status.

### How to Fix These Issues

To restore full functionality, please follow these steps:

1. **Log In Again:** Visit [dotabod.com](https://dotabod.com) and log in with your credentials.
2. **Set Up Your Dota Client and Overlay:** You'll need to configure your Dota client and overlay once more. This process is now fully automated, so you should be up and running quicker than before.

By following these steps, you can restore your Dotabod settings and ensure that all features work correctly. We understand that this process is inconvenient and frustrating, and we deeply apologize for the disruption this has caused to your streaming experience.

## Moving Forward: Lessons Learned and Future Safeguards

This incident has been a harsh reminder of the importance of data integrity and the necessity of having reliable backup systems. Moving forward, we are implementing several measures to prevent such a catastrophe from happening again:

- **Automated Backups with Coolify:** We've enabled automated backups using Coolify, ensuring that our data is regularly and reliably backed up without incurring prohibitive costs.

## A Heartfelt Apology

To our community of gamers and supporters, I extend my sincerest apologies. Losing your data and access to Dotabod is unacceptable, and I take full responsibility for this failure. Your trust is paramount, and I am committed to rebuilding it through unwavering dedication and improved practices.

## Thank You for Your Understanding

Despite this setback, your continued support means the world to us. We are determined to emerge from this stronger and more resilient, providing you with the exceptional service and tools you deserve. If you have any questions or need assistance with re-establishing your account, please reach out to our support team at [support@dotabod.com](mailto:support@dotabod.com).

Stay connected with us on **Twitter** and **Discord** for the latest updates and support.
