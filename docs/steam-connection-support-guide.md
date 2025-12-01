# Steam Connection Support Guide

## Quick Reference for Support Team

This guide helps triage and resolve the most common support tickets: **"How do I connect my Steam account?"**

---

## 🎯 The Core Problem

Users don't understand that:
1. ❌ PowerShell script must be run first
2. ❌ Stream MUST be online for Steam to connect (first time only)
3. ❌ They need to play a match/demo to trigger connection
4. ✅ After first connection, it auto-connects forever

**Technical Root Cause:** Backend `EventHandler.ts:22` blocks ALL Steam connections when `stream_online = false`

---

## 📋 Quick Triage Flow

### Question 1: "Did you run the PowerShell script?"

**If NO:**
```
Hi! To connect your Steam account, you first need to complete the setup.

Please follow these steps:
1. Go to Dashboard Setup (Step 2): https://dotabod.com/dashboard?step=2
2. Run the PowerShell script (automatic installer)
3. Once complete, follow the steps below

Let me know if you need help with the PowerShell script!
```

**If YES:** → Continue to Question 2

---

### Question 2: "Was your Twitch stream online when you played?"

**If NO (Stream was offline):**
```
Ah, that's the issue! Steam accounts can only connect when your stream is live.

Here's what to do:
1. Start streaming on Twitch (go live)
2. Play any Dota 2 match OR demo a hero
3. Go to Features → MMR Tracker
4. Your Steam account should appear

💡 Good news: After this first connection, all future matches auto-connect 
even when offline! You only need to be streaming for the very first time.
```

**If YES (Stream was online):** → Continue to Question 3

---

### Question 3: "Can you send a screenshot of your PowerShell output?"

**Request screenshot:**
```
It sounds like the PowerShell script may have failed. To help diagnose:

🚨 Please send me:
1. A screenshot of your PowerShell output (the terminal/console window)
2. A description of what happened when you ran the script
3. Any error messages you saw

This will help me figure out what went wrong!
```

**Common PowerShell Failures:**
- cfg file not placed in correct folder (`/gamestate_integration/` not `/cfg/`)
- Dota 2 missing `-gamestateintegration` launch option
- Steam not running or logged out during script
- Permission issues (didn't run as Administrator)
- Antivirus blocking the script

---

## 🔍 Advanced Troubleshooting

### Scenario A: Account Conflict

**Symptom:** User says "It shows someone else is using my Steam account"

**Solution:**
```
Your Steam account is currently linked to another Dotabod user. Only one 
person can have a Steam account linked at a time.

Check Features → MMR Tracker to see who is using your account. You can:
1. Ask them to remove it from their dashboard, OR
2. I can help unlink it from their account

Let me know which option works for you!
```

### Scenario B: Manual Setup (Non-Windows)

**User can't run PowerShell (Mac/Linux):**
```
Since you're not on Windows, you'll need to do manual setup:

1. Go to Dashboard Setup: https://dotabod.com/dashboard?step=2
2. Click "Manual Setup" tab
3. Follow the instructions to:
   - Download the cfg file
   - Place it in: [Steam]/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
   - Add -gamestateintegration to Dota 2 launch options
4. Restart Dota 2
5. Start streaming on Twitch
6. Play a match or demo a hero

Let me know if you get stuck on any step!
```

### Scenario C: User Skipped Testing

**User completed setup but never tested:**
```
Your setup is complete! Now you just need to trigger the first connection:

Option 1 (Quick test):
- Start streaming on Twitch
- Demo any hero
- Type !facet in chat to confirm it works
- Check Features → MMR Tracker - your account should appear

Option 2 (Skip testing):
- Start streaming on Twitch
- Just play your first match
- Steam account will connect automatically

After this first connection, all future matches auto-connect!
```

---

## 📊 Common Issues & Solutions

### Issue 1: "I played but nothing happened"

**Most Common Causes (in order):**
1. ⚠️ **Stream was offline** (80% of cases)
   - Solution: Start streaming, play again
2. ⚠️ **PowerShell script failed** (15% of cases)
   - Solution: Request screenshot, troubleshoot script
3. ⚠️ **cfg file in wrong folder** (3% of cases)
   - Solution: Verify `/gamestate_integration/` not `/cfg/`
4. ⚠️ **Dota 2 not restarted** (2% of cases)
   - Solution: Restart Dota 2 and Steam

---

### Issue 2: "How do I know if it worked?"

**Verification Steps:**
```
To confirm your Steam account connected successfully:

1. Go to: https://dotabod.com/dashboard/features
2. Scroll to "MMR Tracker" section
3. You should see your Steam account with:
   - Your Steam avatar
   - Your rank badge
   - Your MMR
   - Your account name (clickable link)

If you see your account there, it worked! 🎉

If not, let's troubleshoot what went wrong.
```

---

### Issue 3: "Do I need to do this every time?"

**Answer:**
```
No! You only need to connect your Steam account ONCE (while streaming).

After that first connection:
✅ All future matches auto-connect (even offline)
✅ Switching Steam accounts? They auto-connect too
✅ Playing offline? Still works
✅ No more setup required - ever!

The "stream must be online" requirement is ONLY for the very first 
connection to verify your setup worked correctly.
```

---

## 🎓 Understanding the Technical Reason

**For technical users who ask "Why?":**
```
Dotabod is a streaming tool, so it only activates when you're live on 
Twitch. This includes the Game State Integration (GSI) system that 
detects your Steam account.

Technical details:
- Backend EventHandler checks stream_online status
- If offline, GSI events are blocked (including Steam detection)
- This is by design - Dotabod is meant for live streaming

Good news: After the first connection while streaming, the system 
remembers your setup and works automatically for all future sessions!
```

---

## 📝 Useful Links to Share

- **Setup Page:** https://dotabod.com/dashboard?step=2
- **Features Page (MMR Tracker):** https://dotabod.com/dashboard/features
- **Help Page:** https://dotabod.com/dashboard/help

---

## 🚨 Red Flags (Escalate These)

Escalate to senior support if user reports:

1. **PowerShell script damaged their system**
   - Unlikely but critical if true
2. **Steam account security concerns**
   - "Someone hacked my account through Dotabod"
3. **Repeated failures after multiple attempts**
   - Stream was online, script succeeded, still no connection
4. **Data privacy concerns**
   - "What data does Dotabod collect from Steam?"

---

## 📈 Success Metrics

Track these to measure support efficiency:

- **First Contact Resolution Rate:** % of tickets resolved with one response
- **Average Response Time:** Time to first helpful response
- **Ticket Volume by Issue Type:**
  - Stream offline
  - PowerShell failed
  - User skipped testing
  - Account conflict
- **User Satisfaction:** Post-resolution survey scores

**Target Goals:**
- 80%+ FCR (First Contact Resolution)
- <2 hour average response time
- 90%+ satisfaction rating

---

## 💡 Tips for Efficient Support

1. **Ask triage questions early** - Don't assume, ask about stream status
2. **Request screenshots proactively** - Especially for PowerShell failures
3. **Link to relevant docs** - Users prefer self-service when possible
4. **Be empathetic but efficient** - Acknowledge frustration but guide to solution
5. **Update this doc** - Found a new pattern? Add it here!

---

## 🔄 Document Updates

**Last Updated:** 2025-12-01

**Recent Changes:**
- Added stream-online requirement emphasis
- Added PowerShell screenshot request template
- Added triage flow decision tree
- Added common failure scenarios

**Contributors:**
- Support Team Lead
- Engineering Team

---

## 📞 Need Help?

If you encounter an issue not covered in this guide:
- Ask in #support-help Slack channel
- Escalate to @engineering-team
- Update this document with the solution!

Remember: Every resolved ticket makes the next one easier! 🎯
