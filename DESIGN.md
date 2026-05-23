---
name: Dotabod
description: Dashboard for Dota 2 streamers on Twitch
colors:
  twitch-purple: 'oklch(0.627 0.265 303.9)'
  twitch-purple-soft: 'oklch(0.827 0.119 306.383)'
  twitch-purple-deep: 'oklch(0.295 0.113 309)'
  surface-base: 'oklch(0.205 0 0)'
  surface-raised: 'oklch(0.269 0 0)'
  surface-hover: 'oklch(0.371 0 0)'
  ink-primary: 'oklch(0.922 0 0)'
  ink-secondary: 'oklch(0.87 0 0)'
  ink-tertiary: 'oklch(0.708 0 0)'
  ink-quiet: 'oklch(0.556 0 0)'
  hairline: 'oklch(0.371 0 0)'
  hairline-hover: 'oklch(0.439 0 0)'
  state-success: 'oklch(0.432 0.095 166.913)'
  state-info: 'oklch(0.398 0.195 277)'
  state-warning: 'oklch(0.476 0.114 70)'
  state-error: 'oklch(0.444 0.177 26)'
typography:
  display:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '3rem'
    fontWeight: 500
    lineHeight: '1'
    letterSpacing: 'normal'
  headline:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: '2rem'
    letterSpacing: 'normal'
  title:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 500
    lineHeight: '1.5rem'
    letterSpacing: 'normal'
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: '1.5rem'
    letterSpacing: 'normal'
  body-small:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: '1rem'
    letterSpacing: 'normal'
  label:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: '1rem'
    letterSpacing: '0.2em'
rounded:
  sm: '0.125rem'
  md: '0.375rem'
  lg: '0.5rem'
  xl: '0.75rem'
  full: '9999px'
spacing:
  xs: '0.5rem'
  sm: '0.75rem'
  md: '1rem'
  lg: '1.25rem'
  xl: '1.5rem'
  2xl: '2rem'
components:
  button-primary:
    backgroundColor: '{colors.twitch-purple-deep}'
    textColor: '{colors.ink-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.375rem 1rem'
  button-primary-hover:
    backgroundColor: '{colors.twitch-purple-soft}'
    textColor: '{colors.ink-primary}'
  button-default:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.ink-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.375rem 1rem'
  button-default-hover:
    backgroundColor: '{colors.surface-hover}'
    textColor: '{colors.twitch-purple-soft}'
  button-danger:
    backgroundColor: '{colors.state-error}'
    textColor: '{colors.ink-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.375rem 1rem'
  card:
    backgroundColor: '{colors.surface-base}'
    textColor: '{colors.ink-secondary}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: '1.25rem'
  card-hover:
    backgroundColor: '{colors.surface-base}'
    textColor: '{colors.ink-secondary}'
  input:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.ink-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0.375rem 0.75rem'
  nav-item:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.ink-secondary}'
    typography: '{typography.body}'
    padding: '0.5rem 1rem'
  nav-item-hover:
    backgroundColor: '{colors.surface-hover}'
    textColor: '{colors.ink-secondary}'
  nav-item-active:
    backgroundColor: '{colors.hairline-hover}'
    textColor: '{colors.ink-primary}'
  chip:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.ink-secondary}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '0.25rem 0.75rem'
  label-eyebrow:
    textColor: '{colors.ink-quiet}'
    typography: '{typography.label}'
---

# Design System: Dotabod

## 1. Overview

**Creative North Star: "The Streamer's Console"**

Dotabod's dashboard is the quiet panel a Dota 2 streamer keeps open on a second monitor. The streamer is on camera. The dashboard is not. It earns its place by staying out of the way: dim gray surfaces, plain Inter copy, a single saturated purple that only shows up when something matters. Settings load, take a click, and the streamer is back to the game.

The system rejects the StreamElements/Streamlabs lineage — no neon accents, no RGB borders, no dense feature menus advertising themselves. It also rejects corporate-SaaS chrome: no faceless gradients, no glassmorphism, no hero-metric template. The dashboard is a utility, not a stage.

Density is moderate. Whitespace is generous in section gaps, tight inside controls. Type sits in a single sans-serif voice (Inter); the optional Radiance fonts in the codebase belong to the OBS overlay, not the dashboard, and must not bleed in.

**Key Characteristics:**

- Dark by default, single-theme (AntD `darkAlgorithm`); no light variant.
- Achromatic grays carry 90%+ of the surface; purple appears as signal, not decoration.
- Cards rest flat; hover is the only thing that ever lifts.
- Sentence case in copy, in labels, in buttons. No SHOUTING TYPOGRAPHY.
- Inter only. No display script, no retro mono, no domain-themed faces.

## 2. Colors

A nearly grayscale palette tinted by Tailwind v4's OKLCH defaults, lit at exactly one place by a saturated Twitch-aligned purple.

### Primary

- **Twitch Purple** (`oklch(0.627 0.265 303.9)`, Tailwind `purple-500`): the system's one true accent. Used for links, active rail/step markers, focused tabs, and the rare "this is the real CTA on this screen" moment. The color a streamer's eye should snap to.
- **Twitch Purple Soft** (`oklch(0.827 0.119 306.383)`, Tailwind `purple-300`): hover and emphasis text. Where the accent needs to read against a dim gray surface without burning out the eye.
- **Twitch Purple Deep** (`oklch(0.295 0.113 309)`, source `rgb(85 24 103)`): AntD primary button fill. Saturated enough to register, dark enough to live on a `surface-base` page without glowing.

### Neutral

- **Surface Base** (`oklch(0.205 0 0)`, Tailwind `gray-900`): page background, card surface. The plate everything sits on.
- **Surface Raised** (`oklch(0.269 0 0)`, `gray-800`): AntD container background, default button surface, input fill. One shade lighter than base.
- **Surface Hover** (`oklch(0.371 0 0)`, `gray-700`): hover states on menu items and ghost buttons.
- **Hairline Hover** (`oklch(0.439 0 0)`, `gray-600`): the border color that appears when a card is hovered. The card itself starts with a transparent border at the same width, so hover doesn't shift layout.
- **Ink Primary** (`oklch(0.922 0 0)`, `gray-200`): headings, primary body, button labels.
- **Ink Secondary** (`oklch(0.87 0 0)`, `gray-300`): supporting body text.
- **Ink Tertiary** (`oklch(0.708 0 0)`, `gray-400`): metadata, secondary subtitles.
- **Ink Quiet** (`oklch(0.556 0 0)`, `gray-500`): uppercase eyebrows, deemphasized labels.

### Tertiary (semantic state)

- **State Success** (`oklch(0.432 0.095 166.913)`, `emerald-800` border / `emerald-200` text): payment success, subscription active, export success.
- **State Info** (`oklch(0.398 0.195 277)`, `indigo-800` border / `indigo-200` text): processing, neutral non-error notices.
- **State Warning** (`oklch(0.476 0.114 70)`, `amber-800` border / `amber-200` text): grace period, action expected.
- **State Error** (`oklch(0.444 0.177 26)`, `red-800` border / `red-200` text): payment failed, destructive confirm.

State tones are used as a triplet: border + tinted background (40% alpha on the 950 step) + light text. Never a side stripe; always a full border.

### Named Rules

**The One Purple Rule.** Twitch Purple appears on no more than 10% of any given screen. If two things on a screen would draw the eye to purple, one of them is wrong. Active rail markers, the primary CTA, and inline links are allowed; everything else uses Ink Secondary or a state tone.

**The No-Rainbow Rule.** The `animate-border-rgb` utility in `tailwind.css` is reserved for Pro upsell theatrics and the marketing surface. It is forbidden anywhere in the authenticated dashboard.

**The Tinted-Neutral Rule.** All neutrals come from Tailwind's zero-chroma OKLCH gray ramp. Do not introduce a parallel `slate`, `zinc`, `stone`, or the legacy `dark-*` ramp from `tailwind.css`. The latter exists for historical compatibility and must not be extended.

## 3. Typography

**Body Font:** Inter (variable, weights 100–900, loaded from `/fonts/Inter-roman.var.woff2`).
**Display Font:** Inter (same family; hierarchy is built from weight and size, not from a second family).
**Reserved fonts:** Radiance and RadianceM are loaded for the OBS overlay's Dota-themed UI only. They must not appear in the dashboard.

**Character:** A single neutral sans speaking at a moderate scale. Inter does the work — tight numerals, level x-height, no italic flourish. Hierarchy comes from weight contrast (400 / 500 / 600) and size jumps, not from family switching.

### Hierarchy

- **Display** (500, `3rem` / 48px, line-height 1): hero page titles. Used sparingly; most dashboard pages start at Headline.
- **Headline** (600, `1.5rem` / 24px, line-height 32px): primary page title (`Header` component's title slot, `h2` in BillingOverview).
- **Title** (500, `1.125rem` / 18px, line-height 24px): card titles, section sub-headers.
- **Body** (400, `0.875rem` / 14px, line-height 24px): the dashboard's default reading size. AntD `Text` and most paragraph copy.
- **Body Small** (400, `0.75rem` / 12px, line-height 16px): meta rows, helper text, inline timestamps.
- **Label** (500, `0.75rem` / 12px, letter-spacing `0.2em`, uppercase): eyebrow tags above metric values ("Current plan", "What's next", "Manage in Stripe").

### Named Rules

**The Sentence-Case Rule.** Headings, buttons, and labels are sentence case. Not Title Case, not ALL CAPS, except for the deliberate uppercase Label role (eyebrows above metric blocks) which is the only place uppercase is allowed.

**The 65–75ch Rule.** Body copy wraps at 65–75ch. Section subtitles use `max-w-3xl` as the practical cap.

**The Single-Voice Rule.** Inter only. Do not pair with a display serif, mono, or script in the dashboard. The OBS overlay's Radiance face is a separate surface; do not import it here.

## 4. Elevation

Surfaces sit flat at rest. Depth is something the system tells you about only when you ask. The dashboard uses two background tones (`surface-base` for cards on `surface-raised` for the page body, or the inverse on some screens) to establish hierarchy without shadow. The only shadow ever visible at rest is a low ambient drop on cards (`shadow-lg` in Tailwind terms), and even that is barely perceptible against the dark base.

Hover is the one place depth becomes a tell. A card's previously-transparent border resolves to `hairline-hover`, and the soft shadow gains a faint purple-aligned tint (`shadow-gray-500/10`). Layout does not shift because the resting border is already drawn at full width — it is just invisible.

### Shadow Vocabulary

- **Ambient card** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`, Tailwind `shadow-lg`): the only resting shadow in the system. Applied to cards. Almost invisible against the dark base — its presence registers only when removed.
- **Hover tint** (`box-shadow: 0 0 0 1px var(--color-gray-500) / 0.1` added to ambient): the hover companion to ambient card. Cards gain it on `:hover`.

### Named Rules

**The Flat-by-Default Rule.** Surfaces never carry a shadow as decoration. If a shadow exists at rest, it exists at the lowest visible value. If a shadow grows, it grows on hover, never on click.

**The No-Glow Rule.** No backdrop-filter blur, no glow halos, no `box-shadow` larger than `shadow-lg`. Glassmorphism is forbidden.

## 5. Components

The dashboard's components are tight and matter-of-fact: small radii, modest padding, no decorative flourish. Most of the visible interactive surface is provided by Ant Design under `theme.darkAlgorithm`, with token overrides in `src/lib/theme/themeConfig.ts` pulling AntD into the Twitch Purple accent.

### Buttons

- **Shape:** `rounded-md` (6px). Never pill, never square.
- **Primary** (`Button type='primary'`): `surface = twitch-purple-deep`, `text = ink-primary`. Padding `0.375rem 1rem` (AntD default). Used for the single most important action on a screen.
- **Default**: `surface = surface-raised`, `text = ink-primary`. The workhorse. Most buttons are default.
- **Link**: text-only, color `twitch-purple-soft`, no background. Used inline in copy. The `a:not(.ant-btn)` rule in `tailwind.css` colors anchors `text-purple-400` automatically.
- **Danger** (`Button danger`): `surface = state-error`, used only in destructive confirms (delete account, cancel subscription). Carries the same shape as Primary.
- **Hover:** background lightens by one step (`twitch-purple-deep → twitch-purple-soft` for Primary; `surface-raised → surface-hover` for Default). Transition `200ms` with `ease-out` curve.
- **Focus:** AntD's default focus ring. Visible — do not suppress it.
- **Loading:** AntD `loading` prop. The button label is replaced by a small `Spin` themed to `twitch-purple-soft` (`Spin.colorPrimary` override in `themeConfig.ts`).

### Chips / Status pills

- **Style:** `rounded-full`, `border` (1px), tinted background using the state color triplet (success/info/warning/error). Padding `0.25rem 0.75rem`.
- **Text:** Body Small, sentence case. No icon-only chips.
- **State variants:** the four state tones from `colors.tertiary`. Always border + background + text together; never just one of the three.

### Cards / Containers (`src/ui/card.tsx`)

- **Corner style:** `rounded-lg` (8px).
- **Background:** `surface-base` (`gray-900`). On the dashboard's `surface-raised` body (`gray-800`), cards read as recessed-darker, not lifted.
- **Border:** drawn at full width with `border-transparent` at rest. On hover the border resolves to `hairline-hover` and a faint shadow tint joins. Layout does not shift.
- **Shadow strategy:** ambient `shadow-lg` at rest; gains the hover tint on `:hover`.
- **Internal padding:** `1.25rem` (`p-5`). Section content inside a card uses `space-y-large` rhythm (AntD `Space size='large'`, ~24px between blocks).
- **Card title:** rendered as an `<h3>` inside a `.title` flex row, weight 500, base size (overridden to `text-lg`), `pb-2` separator from body.

### Inputs / Fields

- **Style:** AntD default in dark algorithm. `surface = surface-raised` (`gray-800`), 1px border at `hairline`, `rounded-md` (6px).
- **Focus:** border shifts to `twitch-purple`. AntD default; no custom override.
- **Error / Disabled:** AntD defaults inherit. Error state borders red; disabled state grays out at half-opacity.

### Navigation (Sidebar Menu)

- **Component:** AntD `Menu` mounted in `DashboardShell.tsx`, theme overrides at `src/lib/theme/themeConfig.ts:21-28`.
- **Default item:** `text = ink-secondary` (`gray-300`), no background.
- **Hover:** background `surface-hover` (`gray-700`).
- **Selected:** background `hairline-hover` (`gray-600`), text `ink-primary` (`gray-200`). Selected color comes from `subMenuItemSelectedColor` token — currently set to `gray-300` for sub-items.
- **Typography:** Body. Sentence case. No SHOUTING.
- **Parent group label:** rendered with the same weight as items. Children are indented one step.
- **`New` flag:** a small AntD green `Tag` rendered inline next to the label. Used sparingly — when a feature has rolled out within the last month. Not used as a sustained attention-grabber.
- **Mobile:** collapses to a hamburger; the menu renders in a sheet. Same styles, full-width items.

### Page Header (`src/components/Dashboard/Header.tsx`)

- **Title:** Headline role (600, 24px).
- **Subtitle:** Body, `ink-tertiary`, capped at `max-w-3xl`. One or two sentences. Never a paragraph.
- **Spacing below:** `space-y-6` (1.5rem) before the first child.

### Eyebrow Label

A signature reused pattern in BillingOverview and SubscriptionAlerts.

- **Style:** Label typography (`0.75rem`, weight 500, tracking `0.2em`, uppercase), color `ink-quiet` (`gray-500`).
- **Use:** small contextual label above a "metric value" (e.g. "Current plan" above the plan tier chip; "What's next" above a date). Never as a heading. Never standalone.

## 6. Do's and Don'ts

### Do

- **Do** keep Twitch Purple to ≤10% of any screen. Use Ink Secondary for ordinary state and reserve purple for active/CTA/link.
- **Do** use full borders for callouts and state tones (`border`, not `border-left`).
- **Do** use sentence case in all labels, buttons, headings, and toasts.
- **Do** keep neutrals on Tailwind's OKLCH `gray` ramp. The `dark-*` ramp is legacy; do not extend it.
- **Do** use AntD's components under `darkAlgorithm`. Override at the `themeConfig.ts` level, not by overriding AntD class names in CSS.
- **Do** keep cards flat at rest. Reveal depth on hover with the existing transparent-to-`hairline-hover` border transition.
- **Do** describe consequences in plain voice for destructive actions ("This permanently deletes your match history. You can't undo this.").
- **Do** match copy to PRODUCT.md's voice: helpful, technical, no-fluff.

### Don't

- **Don't** use side-stripe borders (`border-left` or `border-right` greater than 1px as a colored accent). Use a full border with the state tone.
- **Don't** use gradient text (`background-clip: text` on a gradient). The dashboard has one solid accent.
- **Don't** use the `animate-border-rgb` utility on any authenticated dashboard surface. It belongs to marketing/upsell only.
- **Don't** apply glassmorphism — no `backdrop-filter: blur`, no glass cards. Cards are opaque on `surface-base`.
- **Don't** import the Radiance or RadianceM fonts into the dashboard. They are reserved for the OBS overlay's Dota UI.
- **Don't** use the hero-metric template (giant number, small label, gradient accent). It is the SaaS cliché PRODUCT.md explicitly rejects.
- **Don't** build identical card grids of icon + heading + text. Vary the surface by what it actually needs to communicate.
- **Don't** use modals where an inline disclosure would do. The only modals in the dashboard are destructive confirms; everything else should be inline or progressive.
- **Don't** use ALL CAPS outside the Label role. SHOUTING TYPOGRAPHY is forbidden in headings, buttons, and toasts.
- **Don't** use em dashes in copy. Use commas, colons, semicolons, periods, or parentheses.
- **Don't** copy the StreamElements/Streamlabs aesthetic. No neon, no RGB everything, no ad-stuffed sidebars, no dense feature menus advertising themselves.
- **Don't** mirror corporate-SaaS chrome either — no faceless gradients, no Salesforce-grade density, no formal jargon in errors.
- **Don't** introduce a parallel color ramp (slate/zinc/stone, or a custom new ramp). One ramp. One accent. One state set.
