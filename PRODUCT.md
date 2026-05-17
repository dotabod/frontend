# Product

## Register

product

Note: this project also includes brand surfaces (the marketing homepage at `/`, blog, gift pages, legal pages). When working on those routes specifically, treat them as `brand`. The default register for the dashboard, settings, billing, data, and other authenticated app surfaces is `product`.

## Users

Dota 2 streamers on Twitch — primarily small-to-mid creators — using the dashboard mid-stream-setup. They're frequently hurried, sometimes mid-troubleshooting, and want to get in, change one thing, and get back to streaming. They are technically capable (they already run OBS) but they are not power users of our app. They visit settings infrequently and don't remember what each toggle did last time.

Secondary: returning subscribers visiting billing or data to make a one-off change (cancel, export, switch plan). Calmer mental state, but the same need for clarity over cleverness.

## Product Purpose

Dotabod is a free + paid companion for Dota 2 streamers: real-time overlay stats, MMR tracking, Twitch bet integration, chat moderation, and Notable Players callouts. The frontend is three surfaces — the marketing site (acquisition), the dashboard (configure and manage), and the OBS overlay (the actual on-stream UI).

Success on the dashboard means a streamer can find a setting, understand what it does, change it, and leave — without filing a Discord support question.

## Brand Personality

Helpful, technical, no-fluff. Three-word personality: **clear, capable, unfussy.**

- Voice: plain-English, knowledgeable, dry. Treats users as adults who don't need hand-holding but who also don't want jargon-stuffed UI.
- Tone shifts with context: instructional for setup, neutral for settings, careful for billing, soft and explicit for destructive actions.
- We don't perform personality. No "Oops!", no emoji confetti in error states, no winking gamer references in settings copy. The product earns trust by being clear, not by being chatty.

## Anti-references

**Bloated gamer-bot dashboards.** Specifically what to avoid:

- StreamElements / Streamlabs sprawl — dense feature menus, every cog labeled with internal jargon, settings nested four deep.
- Neon accents, RGB everything, dark mode that screams "gaming".
- Ad-stuffed sidebars, upsell modals interrupting flows.
- Vague navigation labels ("Items", "Manage", "Stuff").
- Copy that sounds AI-generated: hero-metric template, "Welcome to [X]! Let's get started 🚀", "Boom! Your data is on its way.".

Also avoid corporate-SaaS chrome (Salesforce-density, faceless tone) and toy-grade hobby-app energy (comic-sans, emoji overload in billing/legal). The dashboard should feel like a quietly competent utility — closer to Linear settings or Stripe Dashboard than to either extreme.

## Design Principles

1. **Names match user intent, not internal taxonomy.** Nav labels and section titles describe what the user is trying to accomplish, not what the engineering team called the table. "Team access", not "Managers". "Your data", not "Manage data".
2. **Plain English over domain jargon, even for domain experts.** Users know what MMR is — but a settings page that reads cleanly in plain English reads cleanly for everyone, including the half-distracted streamer at 2am.
3. **Buttons describe the action; titles describe the page.** Avoid "Submit", "OK", "Manage" in isolation. Use verb-noun pairs that name the outcome.
4. **Destructive actions get extra clarity, not extra drama.** Spell out consequences in normal voice. No red flashing icons, no all-caps warnings. Just facts and a clear button label.
5. **Confidence through specificity.** "This usually takes 30 seconds" beats "Loading…". "Your subscription renews on May 20" beats "Active subscription".

## Accessibility & Inclusion

- Target WCAG 2.1 AA across product surfaces.
- Keyboard navigation works on every interactive element; focus rings are visible (not removed for aesthetics).
- Respect `prefers-reduced-motion` — confetti, slide-ins, and incidental motion must short-circuit.
- Don't rely on color alone for state. Success/error/warning messages carry both an icon and explicit text.
- Color contrast: body text ≥ 4.5:1, large text ≥ 3:1.
