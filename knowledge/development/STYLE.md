---
type: visual-design-system
title: "ChiroNote Visual Style System"
description: "Exact visual, responsive, interaction, and accessibility rules for reproducing and extending the ChiroNote interface."
resource: "../../src/index.css"
tags: [chironote, design-system, visual-style, css, responsive, accessibility, ui, ios, android, capacitor, cross-platform]
---

# ChiroNote Visual Style System

This is the visual authority for ChiroNote. Use it when designing, implementing, reviewing, or refactoring any user-facing interface. A competent implementation should be able to reproduce the product's appearance from this guide without inventing new colors, spacing, typography, radii, shadows, motion, or responsive behavior.

The current repository contains some older one-off values. This guide distinguishes the intended system from migration debt:

- **Required** means new or materially redesigned UI must follow the rule.
- **Reference implementation** identifies current UI that demonstrates the rule well.
- **Migration note** records a known inconsistency; do not copy it into new work.

The authenticated clinical workspace is the canonical product interface. The public marketing page is an intentionally warmer, editorial exception described in [Public marketing exception](#public-marketing-exception). Do not mix its typography or cream palette into authenticated screens.

## Current audit state (2026-08-24)

This guide is based on the checked-out website `prod` branch at `8c1d03d` plus the current working-tree UI state. The website is the only runnable application in this checkout. The historical `cap-and` and `cap-ios` branches contain Capacitor 6 Android/iOS wrappers around an older CSS tree, but there are no native project directories in the current working tree and no shared native token package has been established. Native parity is therefore a target contract, not a claim that the current branches already match it.

The most recent visual behavior that must be preserved in the next implementation is:

- The public landing page uses the warmer marketing exception, with an `880px` compact-layout boundary, a `1040px` intermediate layout, and a `460px` phone refinement. The earlier `780px` description is stale.
- On compact landing layouts, the hero stacks, the clinical image uses a filled portrait/shallower tablet crop, and the three short assurances sit inside the image. On desktop, the image is unobstructed and the separate assurance strip remains visible.
- The current working-tree landing update makes desktop assurances track scroll progress left-to-right, pauses briefly after `No setup required`, and then reveals the testimonials heading. The page keeps an immediate reduced-motion/browser fallback. This is marketing-only motion and must not become a clinical-workspace pattern.
- The authenticated product has the refined `64px` navigation, calm green/white panel system, sibling Clipboard/Smart Editor surfaces, responsive Recent Notes drawer, explicit dialog focus behavior, and clickable SOAP/Treatment section-copy headers with success, warning, and error feedback.
- The visual system is still partly migrated. `src/index.css` contains the emerging semantic aliases, while `src/App.css`, older recording/tutorial/blog styles, and ContentPopup still contain raw colors, legacy radii, generic shadows, or `transition: all`. Treat those as migration debt, not new precedent.

Use the following status words in implementation reviews:

| Status | Meaning |
| --- | --- |
| **Implemented** | Verified in the current website source or rendered UI. |
| **Shared target** | Required contract for new cross-platform work; native branches are not yet proven to comply. |
| **Migration debt** | Existing behavior that may remain for a focused maintenance change but must not spread. |

## Design principles

1. **Clinically calm**: favor stable white and soft-green surfaces, quiet borders, and restrained depth. The UI must feel dependable during repetitive clinical work.
2. **Content first**: note text, transcript text, and editing controls outrank decoration. Dense lists are acceptable when grouping and hierarchy remain clear.
3. **Green is structural**: dark green identifies the brand and strongest hierarchy; medium green identifies primary actions, focus, and active state. Do not scatter unrelated accent colors.
4. **One obvious action per region**: each panel, modal, or form should have one visually dominant action. Secondary actions stay outlined, neutral, or icon-only.
5. **Touch and keyboard parity**: every action must work with touch, mouse, and keyboard. A moved icon must never be separated from its hit area.
6. **Motion explains state**: animate drawers, disclosure, loading, and direct feedback only. Do not animate clinical content for decoration.
7. **No patient data in visual examples**: screenshots, fixtures, and design reviews must use synthetic or de-identified content.

## Cross-platform unification model

Unify semantics first and rendering second. The three application lines should share names, roles, content hierarchy, states, and interaction outcomes. They should not be forced to share every CSS selector, native control, gesture, animation curve, or system-bar treatment.

### Three layers of ownership

| Layer | Owns | Examples |
| --- | --- | --- |
| **Shared product tokens** | Brand colors, semantic surfaces, type roles, spacing rhythm, shape, elevation, motion intent, control sizes, and state names. | `color.action.primary`, `space.4`, `radius.panel`, `state.recording`. |
| **Platform adapters** | Safe areas, system bars, keyboard/insets, focus APIs, native navigation, haptics/ripples, dynamic text scaling, and lifecycle-specific presentation. | CSS `env()` in the WebView, iOS `safeAreaInsets`/VoiceOver, Android `WindowInsets`/TalkBack. |
| **Surface-specific composition** | Layout and content appropriate to the surface. | Web public marketing page, native recording permission sheet, authenticated Recent Notes drawer. |

The authenticated clinical product is the shared product surface. Public landing, blog, cookie consent, app-store artwork, splash screens, permission prompts, and store metadata are platform or channel surfaces. Do not make the marketing palette a native clinical theme merely because the marketing page is the most recently polished screen.

### Logical units and density

Use logical dimensions, not device-pixel conversions:

- Web uses CSS pixels (`px`), iOS uses points (`pt`), and Android uses density-independent pixels (`dp`). A shared `16` inset means `16px`, `16pt`, or `16dp` at the design layer; do not multiply or divide it by device density.
- Android text uses scalable pixels (`sp`); iOS text uses Dynamic Type or an equivalent scalable text style; Web text uses `rem`/responsive CSS where text may grow. Never lock clinical text to a bitmap-sized device-pixel value.
- Shared controls target a minimum interactive box of `48` logical units. Existing web and iOS-compatible controls with a `44px`/`44pt` minimum are accepted migration debt only when the component is not being redesigned. Android must not ship a shared control below `48dp`.
- Preserve the 4px base grid and the `8px` rhythm across all platforms. Platform adapters may add system insets, but they must not invent a second spacing scale.

### Token naming and handoff

Use semantic names in the portable design source and map them to platform syntax at build time or in one adapter file:

| Token family | Canonical pattern | Web example | Native mapping intent |
| --- | --- | --- | --- |
| Color | `color.<role>.<state>` | `var(--color-action-primary)` | `Color.actionPrimary` / `ChiroNoteColors.actionPrimary`. |
| Type | `type.<role>.<property>` | `font-size`, `line-height`, `font-weight` | SwiftUI text style / Compose `Typography`; keep scaling enabled. |
| Space | `space.<step>` | `var(--space-4)` | `Spacing.space4` in `pt`/`dp`. |
| Shape | `radius.<role>` | `var(--radius-panel)` | `RoundedRectangle` / `RoundedCornerShape`. |
| Elevation | `elevation.<role>` | `box-shadow` | Native shadow/elevation only where the surface needs depth. |
| Motion | `motion.<intent>` | duration/easing | Native timing curve; honor reduced-motion settings. |
| Size | `size.<role>` | `min-height`, `width` | `frame`, `size`, or hit-slop contract. |

Do not copy raw web variable names into native view code one screen at a time. Add or change a semantic token once, then update all platform adapters and the token parity table.

## Product foundation

### Canonical product color tokens

The first five variables already exist in [`src/index.css`](../../src/index.css). The semantic aliases below are the target contract for future consolidation. Until all CSS is migrated, use the exact values in this table.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Brand strong | `--dark-green`, `--color-brand-strong` | `#1e4620` | Authenticated nav, major headings, high-emphasis icons. |
| Primary action | `--medium-green`, `--color-action-primary` | `#2e6930` | Primary buttons, focus, active indicators. |
| Brand supporting | `--light-green`, `--color-brand-support` | `#4a8f4d` | Supporting emphasis and selected borders; avoid for small text on white. |
| Brand tint | `--pale-green` | `#c5e1c6` | Broad pale accents, not text. |
| App canvas | `--off-white`, `--color-canvas` | `#f8f9fa` | Default page background outside the workspace. |
| White surface | `--pure-white`, `--color-surface` | `#ffffff` | Panels, menus, inputs, cards. |
| Soft surface | `--color-surface-soft` | `#fbfdfb` | Dense navigation panels and quiet grouped regions. |
| Primary text | `--color-text` | `#102410` | Main product text and note titles. |
| Secondary text | `--color-text-muted` | `#5c705d` | Metadata, helper copy, timestamps. |
| Supporting text | `--color-text-soft` | `#59705a` | Subtitles and low-emphasis labels. |
| Strong border | `--color-border-strong` | `#cfdbcf` | Panel and drawer outlines. |
| Standard border | `--color-border` | `#dce6dc` | Cards, grouped lists, inputs. |
| Subtle divider | `--color-divider` | `#e2e9e2` | Header and row separators. |
| Hover surface | `--color-hover` | `#f4f8f4` | Row and neutral-control hover. |
| Pressed surface | `--color-pressed` | `#e8f2e8` | Pressed/active background. |
| Count/badge surface | `--color-badge` | `#edf5ed` | Neutral green count badges. |
| Count/badge border | `--color-badge-border` | `#cfe0d0` | Badge outline. |
| New-item surface | `--color-new` | `#d9f2dc` | Newly generated note highlight. |
| Muted marker | `--color-marker-muted` | `#9aab9b` | Metadata dots and quiet markers. |
| Destructive | `--color-destructive` | `#dc3545` | Delete/discard actions only. |
| Destructive hover | `--color-destructive-hover` | `#c82333` | Hover/pressed destructive state. |

Status messages retain the existing accessible combinations from [`ContentPopup.css`](../../src/components/Sidebar/ContentPopup.css):

| Status | Text | Background | Border |
| --- | --- | --- | --- |
| Success | `#155724` | `#d4edda` | `#c3e6cb` |
| Warning | `#856404` | `#fff3cd` | `#ffeeba` |
| Error | `#721c24` | `#f8d7da` | `#f5c6cb` |

Required rules:

- Primary and body text must reach WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text or interface graphics.
- Never use `--light-green` or `--pale-green` for small text on white.
- Color cannot be the only state signal. Pair it with text, an icon, a border/inset bar, or semantic markup.
- The authenticated product currently has no dark theme. Do not infer one by inverting tokens; create and verify a complete token mapping before adding dark mode.

### Target CSS token contract

This is the intended reusable product token layer. Adding these aliases to code should be a deliberate migration; this guide does not claim every alias is already defined in `:root`.

```css
:root {
  --color-brand-strong: #1e4620;
  --color-action-primary: #2e6930;
  --color-brand-support: #4a8f4d;
  --color-canvas: #f8f9fa;
  --color-surface: #ffffff;
  --color-surface-soft: #fbfdfb;
  --color-text: #102410;
  --color-text-muted: #5c705d;
  --color-text-soft: #59705a;
  --color-border-strong: #cfdbcf;
  --color-border: #dce6dc;
  --color-divider: #e2e9e2;
  --color-hover: #f4f8f4;
  --color-pressed: #e8f2e8;
  --color-focus: #2e6930;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  --radius-control: 8px;
  --radius-group: 10px;
  --radius-panel: 12px;
  --radius-dialog: 16px;
  --radius-pill: 999px;

  --shadow-panel: 0 8px 24px rgba(23, 55, 25, 0.08);
  --shadow-drawer: 12px 0 32px rgba(12, 32, 14, 0.16);
  --shadow-menu: 0 18px 42px rgba(23, 55, 25, 0.16);
  --shadow-dialog: 0 18px 46px rgba(12, 32, 14, 0.20);

  --motion-fast: 160ms;
  --motion-standard: 200ms;
  --motion-layout: 300ms;
  --ease-ui: ease;
  --ease-enter: ease-out;

  --size-touch-min: 48px;
  --size-control-min: 40px;
  --size-top-bar: 64px;
  --size-mobile-gutter: 16px;
  --size-content-max: 880px;
}
```

The `--size-*` values are web representations of shared logical dimensions. Native adapters use the same numbers as `pt`/`dp`, with the platform system inset added outside the component's content box.

### Typography

Authenticated product UI uses the Google Fonts imported by [`src/index.css`](../../src/index.css):

- **Body and controls**: `Roboto, Arial, sans-serif`.
- **Headings**: `Montserrat, Arial, sans-serif`.
- **Numeric metadata**: the body face with `font-variant-numeric: tabular-nums` when values align or update.

Use this scale; do not introduce arbitrary intermediate sizes:

| Style | Size / line-height | Weight | Typical use |
| --- | --- | --- | --- |
| Display | `40px / 48px` | 600–700 | Rare authenticated page hero or account heading. |
| Page title | `32px / 38px` | 600 | Standalone authenticated pages. |
| Section title | `24px / 30px` | 600 | Large account/settings sections. |
| Panel title | `20px / 24px` | 600 | Recent Notes, Clipboard, Smart Editor. |
| Control/body | `16px / 24px` | 400–500 | Inputs, body copy, primary controls. |
| Dense row title | `15px / 21px` | 600 | History and other dense navigation rows. |
| Compact control | `14px / 20px` | 500–600 | Toolbars and secondary actions. |
| Metadata | `12px / 16px` or `13px / 18px` | 400–600 | Timestamps, counts, helper copy. |
| Eyebrow/group label | `12px / 16px` | 600–800 | Uppercase week or category labels, `0.055em` letter spacing. |

Required typography rules:

- Default body is `16px` with `line-height: 1.6`; dense controls may reduce line-height, not readability.
- Long clinical text uses `14–16px` and `line-height: 1.6`; never use uppercase for note content.
- Use sentence case for controls and headings. Uppercase is reserved for short group labels or compact marketing eyebrows.
- Clamp dense navigation titles to two lines. Do not truncate editable or clinical body content.
- Keep long-form text measures below roughly `75ch` where the layout allows.

Native typography mapping:

| Product role | Shared baseline | iOS adapter | Android adapter |
| --- | --- | --- | --- |
| Body / clinical text | `16 / 24–26` | Dynamic Type body style with a `16pt` baseline; allow larger accessibility sizes to reflow. | `16sp` baseline through the shared typography theme; allow font-scale changes to reflow. |
| Panel / section title | `20 / 24` or `24 / 30` | Scalable title style, not a fixed `systemFont(size:)`. | `20sp`/`24sp` token in `Typography`, not a view-local literal. |
| Dense row title | `15 / 21` | Scalable subheadline-like role; preserve two-line wrapping. | `15sp` token; do not ellipsize clinical content. |
| Metadata | `12–13 / 16–18` | Caption/footnote role, never the only carrier of important state. | `12–13sp` label role, paired with icon/text when state matters. |

If a native surface is still rendered inside the Capacitor WebView, the CSS typography rules remain authoritative and the native shell must not apply a second font-size transform. If a surface is rewritten in SwiftUI or Jetpack Compose, the adapter must preserve these roles, weight hierarchy, wrapping behavior, and accessibility scaling rather than matching a screenshot with fixed sizes.

### Spacing rhythm

Use a 4px base grid. Preferred values are `4, 8, 12, 16, 20, 24, 32, 40, 48px`.

| Relationship | Required spacing |
| --- | --- |
| Icon to label | `6–8px` |
| Adjacent compact desktop controls | `4–8px`; use `8px` when both are primary touch targets. |
| Label to input | `8px` |
| Title to supporting text | `4px` |
| Header internal padding | `16–20px` |
| Dense row internal padding | `9–12px` |
| Card internal padding | `16–24px` |
| Group-to-group vertical gap | `12–16px` |
| Major section gap | `32–48px` in product UI |
| Desktop workspace gutter | `20px` outer; `30px` between major panels in the current shell. |
| Mobile page gutter | `16px`; dense drawers may use `10–12px`. |

Avoid stacking container padding and child margins that create accidental double gutters. A scroll region should normally own its horizontal inset.

### Safe areas, keyboards, and system chrome

`public/index.html` already opts into `viewport-fit=cover`, but only the marketing hero currently uses `svh`; much of the authenticated CSS still uses `100vh`. Treat the following as the cross-platform target and record exceptions in the component concept:

```css
.fixed-surface {
  padding-top: max(var(--space-4), env(safe-area-inset-top));
  padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
}
```

- Fixed headers, drawers, bottom actions, dialogs, and recording controls must include top/bottom safe-area insets and must not place a hit target beneath the status bar, camera cutout, navigation bar, or home indicator.
- Prefer `100svh`/`100dvh` for mobile viewport-sized surfaces. Use `100vh` only when the element is intentionally allowed to extend behind browser chrome and the safe-area behavior is tested.
- A scroll region owns its content inset. Add bottom padding when a fixed CTA, keyboard accessory, or home indicator could cover the last editable line.
- On keyboard open, clinical textareas and dialogs must remain scrollable and keep the focused field visible. The current native branch configured Capacitor Keyboard `resize: body` and iOS automatic content inset; these are historical settings to re-verify during native integration, not a substitute for layout tests.
- System-bar color and icon mode are shell decisions. They must meet the active surface's contrast and never use a black status bar over the green product header without a deliberate, tested transition.

### Shape and depth

| Element | Radius | Depth |
| --- | --- | --- |
| Compact control | `8px` | None until hover/focus. |
| Grouped list/card | `10px` | Border only. |
| Product panel/drawer | `12px`; mobile edge drawer `0 14px 14px 0` | `--shadow-panel` or `--shadow-drawer`. |
| Dialog/banner | `16px` | `--shadow-dialog`. |
| Avatar/status dot | `50%` | None. |
| Badge/pill | `999px` | None or very subtle. |

Use a border before adding a shadow. Shadows should be green-black and low opacity rather than neutral heavy gray. Do not stack multiple shadows on the same surface.

Migration note: Clipboard, Smart Editor, older recording controls, and parts of Account currently use `4–8px` radii and generic gray shadows. Preserve them in small maintenance changes, but move materially redesigned surfaces toward the table above.

### Icons

- Authenticated product controls use **Material Symbols Rounded**, already loaded by the app.
- Keep one outline/rounded icon language within a control layer; do not mix emoji, raster icons, and glyph families.
- Default sizes: `20px` compact controls, `24px` standard controls/navigation, `28–33px` only for prominent mobile panel controls.
- The visible glyph may be smaller than its button. The current website baseline is at least `44×44px` on touch layouts; the shared cross-platform target is `48×48` logical units as described below.
- For new shared components, prefer a `48×48` logical-unit hit target across Web/iOS/Android. Existing `44×44` web/iOS targets remain valid only as migration debt where expanding the box would change an established layout.
- Icon-only controls require an `aria-label` describing the action, not the icon name.
- Destructive actions use the same icon family and become red through state styling; do not use a different icon style to imply danger.

## Layout and responsive system

### Breakpoints and test widths

The authenticated app switches at `768px`; the scoped marketing page switches at `880px` and also adapts at `1040px` and `460px`. Do not add nearby breakpoints for local fixes unless the layout genuinely changes mode. The `880px` marketing boundary is intentionally separate from the authenticated `768px` boundary because the public hero needs more width to preserve its image/copy composition.

Required verification widths:

| Width | Purpose |
| --- | --- |
| `375px` | Small phone portrait baseline. |
| `667px` | Phone landscape baseline. |
| `768px` | Authenticated mobile boundary. |
| `1024px` | Tablet/small desktop. |
| `1280px` | Standard desktop workspace. |
| `1440px` | Wide desktop. |

All states must avoid document-level horizontal scrolling. Lists and text areas may scroll vertically inside a bounded region. Tables, when unavoidable, get a deliberate horizontal-scroll wrapper rather than widening the page.

Native width classes should be derived from available content width rather than copied from browser breakpoints:

| Native class | Approximate available width | Composition intent |
| --- | --- | --- |
| Compact | `<600` logical units | One column, full-width actions, edge drawer or sheet, no side-by-side editors. |
| Regular | `600–839` | Wider single-column content; allow two-up supporting cards only when each remains usable. |
| Expanded | `>=840` | Side-by-side workspace surfaces, persistent navigation where useful, bounded long-form text measure. |

These are target native composition classes, not a claim that the current Capacitor branches implement them. A tablet/landscape test must validate the actual available content width after safe-area and split-screen insets.

### Platform behavior matrix

| Concern | Shared invariant | Web implementation | iOS adaptation | Android adaptation |
| --- | --- | --- | --- | --- |
| Top bar | Brand, current destination, and primary action remain in the same visual order. | Authenticated `64px`; public `72px` desktop / `64px` compact. | Content bar plus safe-area inset; use native back/navigation semantics. | Content bar plus `WindowInsets`; preserve system back behavior and status-bar contrast. |
| Recent Notes | One grouped list, visible date metadata, one selected/new state, and one vertical scroll owner. | Desktop sibling panel; compact edge drawer with scrim. | Navigation drawer or sheet; VoiceOver focus enters the drawer and dismisses predictably. | Modal navigation drawer or sheet; TalkBack focus and system Back dismiss before leaving the screen. |
| Clipboard / Smart Editor | Text remains editable, reviewable, and copyable; no hidden horizontal overflow. | Sibling panels; textareas own vertical scroll. | Scroll view keeps focused field above keyboard; use native selection/copy affordances if rewritten. | IME resize/pan keeps the caret visible; use selection/copy affordances and Back-to-dismiss keyboard. |
| Dialog / popup | Explicit title, close action, focus return, scrim, and non-color-only status. | Focus trap, Escape, `48%` scrim, `dvh` containment. | Sheet or full-screen cover when compact; VoiceOver escape/dismiss and safe-area padding. | Dialog/bottom sheet with Back dismissal; TalkBack announcement and IME-safe content. |
| Primary action | One dominant action, stable bounds, pressed/disabled/loading states. | Hover plus `:active`/focus-visible; `44px` legacy minimum, `48px` target. | Pressed opacity/color; `44pt` platform minimum, `48pt` shared target. | Ripple/pressed state; `48dp` minimum and explicit disabled semantics. |
| Recording | Record, pause/resume, stop/discard, processing, and failure remain distinct by label/icon/state. | Browser permission and MediaRecorder feedback. | Native permission/lifecycle adapter; do not make a gesture the only stop path. | Runtime permission/lifecycle adapter; system Back/background state must be explicit. |
| Motion | Motion explains state and is optional. | CSS transitions/IntersectionObserver; marketing scroll-linked motion only. | Reduce/disable when Reduce Motion is enabled; avoid scroll-linked clinical motion. | Respect animator/reduced-motion settings; avoid continuous clinical animation. |
| Iconography | Same semantic icon and size tier wherever possible. | Material Symbols Rounded. | Use the approved vector family; SF Symbols are allowed only as a platform-semantic substitute. | Material vector icons or the approved shared icon asset; no emoji. |

### Authenticated application shell

Reference: [`src/App.css`](../../src/App.css), [`MainWorkspace.jsx`](../../src/components/AppShell/MainWorkspace.jsx), and [Authenticated Application Shell](../components/app-shell.md).

- Authenticated navigation occupies `64px` total vertical space.
- Desktop `.app-main` height is `calc(100vh - 64px)`, arranged in a row with `20px` outer padding.
- The workspace canvas uses `linear-gradient(to bottom, #f0f0f0, #e0e0e0)`.
- Recent Notes is `clamp(280px, 24vw, 340px)`.
- Clipboard takes remaining width; Smart Editor is hidden at width `0` until opened, then uses approximately half the Clipboard flex share.
- Major desktop panels currently have `30px` separation.
- On screens `<=768px`, the page has no outer workspace padding. Clipboard fills the viewport below navigation; Recent Notes becomes a fixed drawer.
- Contain overscroll in app workspaces and drawers so iOS rubber-banding does not move the underlying page.

### Panels, editors, and long-form text

Reference: [Clinical Clipboard](../components/clipboard.md), [`src/App.css`](../../src/App.css), and [`Clipboard.jsx`](../../src/components/Clipboard/Clipboard.jsx).

- A panel is a column: header, optional toolbar, and exactly one flexible content/scroll region.
- Use `min-height: 0` on flex children that scroll; without it, long content expands the panel instead of scrolling.
- Standard panel surface is white or `#fbfdfb`; border is `#cfdbcf`; redesigned radius is `12px`.
- Panel headers use `20px/24px` Montserrat at weight `600`, with `16–20px` padding and a `#e2e9e2` bottom divider.
- Toolbars use `#f8f9fa`, an `8px` inset, a `#dee2e6` divider, and `4–8px` control gaps.
- Clinical textareas use a white background, `16px` padding, `14–16px` Roboto, `1.6` line-height, `8px` radius, and a visible green focus ring.
- Dictation caret is `#2e6930`. While dictation owns a field, preserve focus and caret visibility while rejecting manual changes.

Implemented dashboard editor refinement:

- Clipboard and Smart Editor are visual siblings: `12px` panel radius, `1px #cfdbcf` border, the standard panel shadow, identical header tiers, and one inset editor surface.
- Their toolbars use `#fbfdfb`, `6px 12px` padding, a `#e2e9e2` divider, `6px` control gaps, and a `52px` minimum row height.
- Their textareas use `20px` padding, `10px` radius, and a `3px` translucent green focus ring.
- At constrained desktop widths, an open Smart Editor keeps at least `280px` working width while Clipboard remains flexible; use `16px` between these active work surfaces.

### Authenticated navigation

Reference: [`Navbar.css`](../../src/components/Navbar/Navbar.css) and [Authenticated Navigation](../components/navbar.md).

- Background: `#1e4620`; minimum content height `60px`; padding `8px 16px`.
- Text logo height: `30px` desktop, `25px` mobile.
- Desktop navigation is right-aligned with `20px` gaps.
- Links use white/off-white text, `16px`, `8px 12px` padding, an icon gap of `8px`, and a compact radius.
- Hover uses `rgba(0, 0, 0, 0.3)` with pale-green text.
- At `<=768px`, hide desktop links and show the menu button. The menu is `200px` wide, dark green, right-aligned, and above product panels at z-index `1004`.
- Logout uses a semantic button and stays visually quiet in global navigation so it does not compete with clinical work; reserve red destructive emphasis for confirmations and irreversible actions.

Implemented authenticated-nav refinement:

- The dashboard header is `64px` high with `8px 20px` padding, a subtle white divider, and restrained green-black shadow.
- Brand and navigation targets are at least `44px` high. Desktop links use approximately `15px` text, `21px` outline icons, `8px` radius, and `4px` group gaps.
- Hover uses `rgba(255, 255, 255, 0.11)`; pressed/current uses `0.16`; keyboard focus uses a `2px` white outline with `2px` offset.
- The mobile menu is a `216px` white product surface with the standard border, `12px` radius, menu shadow, and dark product text.

### Recent Notes and dense navigation

This is the best current reference for dense product UI: [`HistorySidebar.jsx`](../../src/components/Sidebar/HistorySidebar.jsx), [`HistoryListItem.jsx`](../../src/components/Sidebar/HistoryListItem.jsx), and the history rules in [`src/App.css`](../../src/App.css).

- Panel: `#fbfdfb`, `1px #cfdbcf` border, `12px` radius, `0 8px 24px rgba(23, 55, 25, 0.08)` shadow.
- Header: `20px 20px 16px` padding desktop; `18px 16px 14px` mobile. Title and subtitle are separated by `4px`.
- Count badge: minimum width `28px`, height `28px`, `0 8px` padding, pill radius, `#edf5ed` surface, `#cfe0d0` border, `12px` bold tabular number.
- Scroll region: one vertical scroller with `12px` desktop or `10px` mobile side padding.
- Week header: minimum height `44px`, `8px 8px 6px` padding, `12px` uppercase label, and a `20px` disclosure icon.
- Week surface: white, `1px #dce6dc`, `10px` radius, overflow clipped.
- Note row: minimum `64px` desktop or `60px` mobile, `10px 12px` desktop padding, full-width semantic button.
- Note title: approximately `15px`, weight `600`, line-height `1.4`, maximum two lines.
- Metadata: approximately `12px`, `#5c705d`, `7px` gap, `3px` round separators, tabular numbers.
- Hover: `#f4f8f4` plus `3px` inset `#82a984` leading indicator. Pressed: `#e8f2e8`. New item: `#d9f2dc` plus `4px` inset medium-green indicator.
- Mobile drawer: width `min(88vw, 360px)`, top `64px`, height `calc(100vh - 64px)`, right corners `14px`, drawer shadow.
- Mobile close button: a real `44×44px` button positioned at the drawer's right edge; the glyph and hit target must move together.

### Buttons and controls

Product button hierarchy:

| Type | Appearance | Behavior |
| --- | --- | --- |
| Primary | Medium-green surface, white label, `8px` radius, weight `600`. | Hover dark green; pressed may darken or use a subtle inward state without layout shift. |
| Secondary | White/transparent surface, `1px #cfdbcf` border, dark-green label. | Hover `#f4f8f4`; pressed `#e8f2e8`. |
| Tertiary | No border or fill, dark-green text/icon. | Hover gets a quiet green surface; underline only for text links. |
| Destructive | `#dc3545` surface or red text on neutral surface. | Hover `#c82333`; never use green for destructive confirmation. |
| Disabled | Native `disabled`, no pointer action, reduced opacity around `0.55–0.7`. | Do not rely on a `.disabled` class alone. |

Required dimensions:

- Standard action: minimum height `40px` desktop and `48px` for a new shared touch component. Existing web/iOS controls may remain `44px` until redesigned; Android shared controls require `48dp`.
- Icon-only touch action: minimum `48×48` logical units for new shared components; the visible glyph may remain `20–24` units.
- Compact desktop toolbar action may render at `32px` only when it is not the mobile target; expand it to `44px` at touch breakpoints.
- Horizontal padding: `12–20px` product actions; icon/label gap `6–8px`.
- Adjacent touch targets have at least `8px` separation unless one shared toolbar provides equivalent visual grouping and hit-area separation.

Never animate dimensions, borders, or transforms in a way that moves neighboring controls. Hover lift is reserved for public marketing CTAs, not dense clinical toolbars.

### Forms

- Always render a visible label. Placeholder text is supplemental and uses muted text.
- Default control: `16px` text, `12px` padding, `1px #dce6dc` border, `8px` radius, white surface.
- Focus: `2px #2e6930` outline with `2px` offset, or `0 0 0 3px rgba(46, 105, 48, 0.14)` when an outline would clip.
- Error appears next to the relevant field using the error color combination; also set invalid semantics and descriptive text.
- Keep forms around `350–600px` wide depending on task complexity. Long settings forms should not span the full desktop viewport.
- Textareas resize vertically unless their height is managed by a bounded editor panel.
- Loading and submission states preserve button width to avoid layout shift.

Migration note: [`Feedback.css`](../../src/components/Feedback/Feedback.css) uses a gradient pill submit button and larger label spacing. A material redesign should move it to the product button and form rules above.

### Dialogs, drawers, menus, and overlays

- Dialog surface: white, `16px` radius, `1px #cfdbcf` border, `--shadow-dialog`.
- Default scrim: `rgba(0, 0, 0, 0.48)`. A green-tinted drag target may use `rgba(7, 87, 21, 0.35)` plus a dashed dark-green border.
- Keep close action in the top-right visual corner with a `48×48` logical-unit target for new shared dialogs (`44pt` is the iOS minimum and may be used by an iOS-specific legacy surface).
- Trap focus in true modal dialogs, return focus to the trigger when dismissed, and support Escape unless dismissal would lose an in-progress critical operation.
- Menus align to their trigger edge and use `8–16px` padding, `10–16px` radius, and `--shadow-menu`.
- Do not place interactive content below fixed navigation or behind mobile safe areas.

### Recording and processing states

Reference: [`Recording.css`](../../src/components/Recording/Recording.css) and [Recording, Dictation, and Note Generation](../components/recording.md).

- Recording UI inherits product greens and uses white modal surfaces.
- Primary recording action uses medium green; pause/resume remain clearly distinct through icon and label, not color alone.
- Stop/discard uses destructive red.
- Spinners use a pale/light-green track and dark/medium-green active segment.
- Processing overlays must communicate a named state such as “Preparing transcript” or “Generating note”; never show an unexplained indefinite spinner.
- Keep controls stable as state changes. Do not swap button dimensions between record, pause, resume, and stop.

### Feedback, billing, settings, authentication, and consent

- **Feedback**: use the canonical form system. Success appears inline in the success palette and must not rely on green fill alone.
- **Account/subscription**: cards may use `12–16px` radii and subtle green borders. Active plans use a stronger border plus an explicit active label/check. Counters use tabular numerals. Avoid copying older neon fallback greens such as `#48c78e`; the root brand tokens win.
- **Authentication**: Amplify receives `8px` button radius, medium-green primary buttons, dark-green hover, light-green focus, pale-green modal background, and `#f6fdf6` router surface. See [Third-party and Amplify UI](#third-party-and-amplify-ui).
- **Cookie consent**: follows the public marketing palette because it appears on public pages. It is a fixed `min(620px, 100vw - 36px)` banner, `16px` radius, and stacks into one column below `640px`.

## Interaction, motion, and state

### Focus and keyboard

- Never remove focus outlines without a visible replacement.
- Product focus ring: `2px solid #2e6930`, normally `2px` outside; use a negative offset only inside clipped list surfaces.
- Marketing focus ring: `3px solid #d8a93d`, `4px` offset.
- DOM and visual order must agree. Use native buttons, links, inputs, and disclosure semantics before adding roles to generic elements.
- `Enter` and `Space` activate buttons; Escape dismisses menus/dialogs; arrow-key behavior is required only for widgets whose native pattern expects it.

### Motion

| Motion | Duration | Easing |
| --- | --- | --- |
| Hover/focus color | `160–200ms` | `ease` |
| Press feedback | `80–150ms` | `ease` |
| Drawer/panel layout | `300ms` | `ease` or `ease-out` entering |
| Menu reveal | `100–180ms` | `ease-out` |
| Accordion | `180–240ms` | `ease` |

Animate `opacity` and `transform` when possible. Avoid decorative pulsing, bouncing, and continuous animation in the clinical workspace. New-note emphasis uses a static tinted surface and inset bar rather than a pulse.

Every feature with motion must include:

```css
@media (prefers-reduced-motion: reduce) {
  .affected-element {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
  }
}
```

### Z-index scale

Use the smallest applicable layer and avoid arbitrary escalation:

| Layer | Value | Examples |
| --- | --- | --- |
| Local content | `0–10` | Floating SOAP controls inside a panel. |
| Sticky public navigation | `100` | Marketing nav. |
| Scrim | `999` | Mobile drawer or modal overlay. |
| Drawer/dialog | `1000` | Recent Notes drawer, recording dialog. |
| Panel control | `1003` | Drawer open/close control. |
| Navigation menu | `1004` | Authenticated mobile account menu. |
| Foreground popup | `1010–1011` | Content popup and its local menus. |
| Global blocker/banner | `9999` | Loading overlay or cookie consent. |

## Public marketing exception

Reference: [`LandingPage.css`](../../src/components/LandingPage/LandingPage.css), [`CookieConsent.css`](../../src/components/CookieConsent/CookieConsent.css), and [Public Landing Pages](../components/landing-page.md).

Marketing is warmer and more editorial, but still calm and healthcare-appropriate.

### Marketing tokens

| Token | Value | Role |
| --- | --- | --- |
| `--marketing-sage` | `#6f9382` | Supporting accent and borders. |
| `--marketing-sage-dark` | `#425f51` | Accent text and hover. |
| `--marketing-green` | `#273f34` | Headings and CTA background. |
| `--marketing-cream` | `#f2ece2` | Warm accent surface. |
| `--marketing-background` | `#f8f7f3` | Page canvas. |
| `--marketing-surface` | `#fffefa` | Cards and nav. |
| `--marketing-text` | `#323631` | Body text. |
| `--marketing-muted` | `#646b65` | Supporting text. |
| `--marketing-border` | `#deded6` | Dividers and cards. |
| Focus | `#d8a93d` | Keyboard focus only. |

Marketing typography:

- Body/actions: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Hero and major section headings: `Georgia, "Times New Roman", serif`, weight `400`, letter spacing `-0.025em`.
- Hero heading: `clamp(2.65rem, 5vw, 4.65rem)`, line-height `1.03`.
- Section heading: `clamp(2rem, 4.2vw, 3.25rem)`, line-height `1.15`.
- Marketing buttons are pill-shaped, minimum `52px` high, `13px 28px` padding, with a restrained `-2px` hover lift.

Marketing layout:

- Sticky nav is `72px` desktop and `64px` mobile, max content width about `1200px`.
- Major sections use `clamp(72px, 9vw, 116px) 24px` padding.
- Cards use `18–24px` radii, `20px` grid gaps, and low-opacity green shadows.
- Hero is two columns until `880px`, then stacks. Do not use the clipped hero polygon on mobile.
- At `<=880px`, primary CTA groups stack full-width, grids become one column, and testimonials become a scroll-snap carousel.
- At `<=460px`, reduce section gutters to `18px` and scale media/card radii modestly.

The current desktop trust strip is a special scroll-linked sequence: each assurance moves in from the left as its own scroll interval resolves, the final assurance remains readable for a short scroll distance, and the testimonials heading follows after that handoff. It must be disabled for reduced-motion users and must not be reused in the authenticated workspace, where direct interaction feedback is preferred over scroll choreography.

Marketing styles must remain scoped below `.marketing-page`. Never redefine global `body`, `nav`, `h1`, or root product tokens from landing CSS.

## Third-party and Amplify UI

Reference: [`src/App.css`](../../src/App.css) and [Authentication UI](../components/auth-ui.md).

- Theme third-party UI through its supported token API before using selector overrides.
- Amplify primary button is medium green, hover is dark green, button radius is `8px`, field focus is light green, and the authenticator router surface is `#f6fdf6`.
- Imported third-party components must still satisfy the product focus, contrast, shared touch-target, typography, safe-area, and reduced-motion rules.
- Keep third-party overrides scoped to the component root, such as `[data-amplify-authenticator]`.

## Component parity matrix for iOS and Android

Use this matrix when porting a surface. A port is not complete when it only matches colors; it must match the content hierarchy, state vocabulary, scrolling ownership, accessibility outcome, and platform-appropriate interaction.

| Surface | Shared contract | Web reference | Native acceptance criteria |
| --- | --- | --- | --- |
| Authenticated navigation | `64` logical-unit content bar, brand, current route, account/menu action, visible focus/pressed state. | [`Navbar.css`](../../src/components/Navbar/Navbar.css). | Safe-area-aware top bar; native back behavior; VoiceOver/TalkBack order matches visual order; all icon actions hit `48` logical units. |
| Recent Notes | Soft panel, grouped weeks, visible `time \| weekday \| date` metadata, two-line title maximum, selected/new indicator, one vertical scroller. | [`HistorySidebar.jsx`](../../src/components/Sidebar/HistorySidebar.jsx), [`HistoryListItem.jsx`](../../src/components/Sidebar/HistoryListItem.jsx). | Drawer/sheet presentation adapts to width; swipe/back dismissal does not conflict with system gestures; long titles and enlarged text remain usable. |
| Clipboard and Smart Editor | Visually paired panels, clear header/toolbar/editor tiers, editable clinical text, dictation caret, copy/review actions. | [`src/App.css`](../../src/App.css), [`Clipboard.jsx`](../../src/components/Clipboard/Clipboard.jsx). | Keyboard/IME keeps caret visible; text selection and copy remain native-feeling; no fixed-height clipping at large text sizes. |
| Recording and dictation | Stable record/pause/stop states, named processing state, explicit failure/retry/discard, no color-only state. | [`Recording.css`](../../src/components/Recording/Recording.css), [`RecordingManager.jsx`](../../src/components/Recording/RecordingManager.jsx). | Permission, interruption, background, lock-screen, and audio-route behavior belong to platform adapters; UI states remain shared and contract-tested. |
| Dialogs and content popup | Title, close action, scrim, focus return, safe scroll region, section-copy feedback palette. | [`ProductDialog.css`](../../src/components/Dialog/ProductDialog.css), [`ContentPopup.css`](../../src/components/Sidebar/ContentPopup.css). | iOS sheet/full-screen and Android dialog/bottom-sheet choices may differ, but dismissal, announcement, and error semantics do not. SOAP and Treatment headers remain individually copyable. |
| Billing and Settings | Bounded cards, `24/30` section titles, `44+` action height, explicit loading/success/error, tabular usage values. | [`Billing.css`](../../src/components/Billing/Billing.css), [`Settings.css`](../../src/components/Settings/Settings.css). | Forms reflow under dynamic text and IME; progress states preserve action width; success is explicit and not timer-only. |
| Authentication | Amplify contract, visible labels, product green primary action, focus and error semantics. | [`SignIn.jsx`](../../src/components/AuthUI/SignIn.jsx), [`src/App.css`](../../src/App.css). | Permission/login handoff does not lose return route; secure text and system autofill remain native; screen-reader labels are descriptive. |
| Public marketing | Separate warm palette, editorial type, 880px breakpoint, marketing-only motion and CTA hierarchy. | [`LandingPage.css`](../../src/components/LandingPage/LandingPage.css). | Keep as responsive WebView/web surface unless a separate native acquisition design is approved; never leak marketing tokens into clinical screens. |

## Current migration backlog

This is the minimum sequence for a real style-unification effort. It is intentionally ordered so the UI can converge without mixing visual cleanup with recording/backend behavior changes.

1. **Freeze the shared token contract.** Extract the color, type, spacing, shape, elevation, motion, and size tables above into one portable source. Generate or manually maintain Web CSS, iOS, and Android adapters from that source; add a parity test that fails on missing or differently named semantic tokens.
2. **Classify every surface.** Mark each component as shared clinical, platform shell, or public marketing. Move legacy landing/tutorial/blog values out of the clinical migration queue rather than blending them into product tokens.
3. **Migrate the web foundation.** Replace repeated raw values in `src/App.css`, `Recording.css`, `ContentPopup.css`, Billing/Settings/Feedback styles, and older Blog/Tutorial styles with semantic aliases. Replace `transition: all`, unbounded `100vh`, and layout-shifting transforms with explicit properties and safe viewport units.
4. **Build platform adapters.** Add safe-area/system-bar, keyboard/IME, dynamic text, native focus, ripple/pressed, haptic, back, sheet/drawer, and permission adapters. Keep the shared component state names and copy unchanged.
5. **Port by component contract.** Start with navigation, Recent Notes, Clipboard/Smart Editor, dialogs, and settings. Recording/media lifecycle remains a separate adapter effort governed by [Web, Android, and iPhone Codebase Divergence](../architecture/platform-divergence.md).
6. **Run the parity matrix.** Test web at `375`, `667×375`, `768`, `1024`, `1280`, and `1440px`; test iOS at a small phone, large phone, and iPad portrait/landscape; test Android at a small phone, large phone, and tablet portrait/landscape. Include keyboard open, largest text setting, screen reader, reduced motion, light theme, and interruption/background cases.
7. **Record exceptions.** Any platform-specific deviation needs a reason, owner, affected token/component, and a follow-up issue. A screenshot match is not enough evidence to accept a deviation.

### Minimum parity evidence per component

- Token snapshot: semantic colors, type role, spacing, radius, elevation, and motion intent used.
- Layout snapshot: compact/regular/expanded dimensions, safe-area inset, scroll owner, and keyboard behavior.
- State snapshot: default, pressed/hover, focus, disabled, loading, selected, success, and error.
- Accessibility snapshot: label/role, focus order, text scaling, contrast, and non-color state signal.
- Interaction snapshot: back/dismiss behavior, gesture conflict review, haptic/ripple policy, and reduced-motion behavior.

## CSS and component implementation rules

1. Use semantic tokens rather than adding raw hex values inside JSX. Raw values are permitted only while migrating an existing stylesheet and must match this guide.
2. Keep feature styles in their feature stylesheet. `src/App.css` owns the authenticated shell and shared workspace patterns; avoid adding unrelated page styles there.
3. Scope public-page CSS under its page root to prevent route-to-route leakage.
4. Prefer classes and native state selectors over inline styles. Existing Clipboard inline toolbar CSS is migration debt.
5. Use `box-sizing: border-box` for all new component trees.
6. Avoid `transition: all`; enumerate properties so layout does not animate accidentally.
7. Use `min-width: 0` for flex/grid text children and `min-height: 0` for nested scroll regions.
8. Do not encode state only in class names when a native attribute exists: use `disabled`, `aria-expanded`, `aria-current`, `aria-invalid`, and dialog semantics.
9. Do not use `!important` except to override a third-party library or guarantee reduced-motion behavior. Document the reason next to it.
10. Keep responsive overrides near the component rules or in one intentional final override block; avoid duplicating the same breakpoint block multiple times.

## Visual review checklist

Before considering a UI change complete:

- [ ] Compare against this guide and the nearest reference implementation.
- [ ] Verify `375`, `667×375`, `768`, `1024`, `1280`, and `1440px` layouts as applicable.
- [ ] Confirm no document-level horizontal overflow.
- [ ] Confirm the intended element owns scrolling and fixed controls do not cover content.
- [ ] Check every interactive state: default, hover, pressed, focus-visible, disabled, loading, selected, success, and error.
- [ ] Confirm new shared touch targets are at least `48×48` logical units (`44pt` is the iOS minimum; existing web/iOS `44px`/`44pt` controls are migration debt) and adjacent targets have sufficient separation.
- [ ] Check primary text at 4.5:1 and UI graphics/borders at 3:1 where required.
- [ ] Verify keyboard order and accessible names from the rendered DOM.
- [ ] Verify reduced-motion behavior.
- [ ] Test text wrapping with long note labels, browser zoom, and enlarged system text.
- [ ] Test safe-area insets, keyboard/IME open, back/dismiss behavior, and scroll ownership on native targets.
- [ ] Test VoiceOver and TalkBack focus order, labels, announcements, and custom-control roles.
- [ ] Confirm the semantic token snapshot is equivalent across Web CSS, iOS, and Android adapters.
- [ ] Use only synthetic/de-identified visual fixtures.
- [ ] Run `npm run build` and the relevant tests.
- [ ] Update this guide, the affected component concept, `knowledge/index.md`, and `knowledge/log.md` when the visual contract changes.

## Reference map

| Area | Style source | Knowledge context | Relevant guide section |
| --- | --- | --- | --- |
| Global product foundation | [`src/index.css`](../../src/index.css) | [Local Development and Change Workflow](./workflow.md) | [Product foundation](#product-foundation) |
| Authenticated shell | [`src/App.css`](../../src/App.css) | [Authenticated Application Shell](../components/app-shell.md) | [Authenticated application shell](#authenticated-application-shell) |
| Recent Notes | [`HistorySidebar.jsx`](../../src/components/Sidebar/HistorySidebar.jsx), [`HistoryListItem.jsx`](../../src/components/Sidebar/HistoryListItem.jsx) | [History Sidebar and Smart Editor](../components/sidebar.md) | [Recent Notes and dense navigation](#recent-notes-and-dense-navigation) |
| Clipboard/editor | [`Clipboard.jsx`](../../src/components/Clipboard/Clipboard.jsx), [`src/App.css`](../../src/App.css) | [Clinical Clipboard](../components/clipboard.md) | [Panels, editors, and long-form text](#panels-editors-and-long-form-text) |
| Navigation | [`Navbar.css`](../../src/components/Navbar/Navbar.css) | [Authenticated Navigation](../components/navbar.md) | [Authenticated navigation](#authenticated-navigation) |
| Recording | [`Recording.css`](../../src/components/Recording/Recording.css) | [Recording, Dictation, and Note Generation](../components/recording.md) | [Recording and processing states](#recording-and-processing-states) |
| Billing and Settings | [`Billing.css`](../../src/components/Billing/Billing.css), [`Settings.css`](../../src/components/Settings/Settings.css) | [Billing and User Settings](../components/billing-settings.md) | [Feedback, billing, settings, authentication, and consent](#feedback-billing-settings-authentication-and-consent) |
| Authentication | [`src/App.css`](../../src/App.css), [`SignIn.jsx`](../../src/components/AuthUI/SignIn.jsx) | [Authentication UI](../components/auth-ui.md) | [Third-party and Amplify UI](#third-party-and-amplify-ui) |
| Marketing | [`LandingPage.css`](../../src/components/LandingPage/LandingPage.css) | [Public Landing Pages](../components/landing-page.md) | [Public marketing exception](#public-marketing-exception) |
| Consent | [`CookieConsent.css`](../../src/components/CookieConsent/CookieConsent.css) | [Cookie Consent and Analytics](../components/cookie-consent.md) | [Public marketing exception](#public-marketing-exception) |
| Native shell evidence | Historical `origin/cap-and` and `origin/cap-ios` Capacitor configuration, permissions, and platform assets | [Web, Android, and iPhone Codebase Divergence](../architecture/platform-divergence.md) | [Cross-platform unification model](#cross-platform-unification-model), [Platform behavior matrix](#platform-behavior-matrix) |

## Provenance

Synthesized from the current implementation, the rendered landing page at representative compact/desktop widths, and specific evidence from [`public/index.html`](../../public/index.html), [`src/index.css`](../../src/index.css), [`src/App.css`](../../src/App.css), [`Navbar.css`](../../src/components/Navbar/Navbar.css), [`HistorySidebar.jsx`](../../src/components/Sidebar/HistorySidebar.jsx), [`HistoryListItem.jsx`](../../src/components/Sidebar/HistoryListItem.jsx), [`MobileHistoryToggle.jsx`](../../src/components/Sidebar/MobileHistoryToggle.jsx), [`ContentPopup.css`](../../src/components/Sidebar/ContentPopup.css), [`ProductDialog.css`](../../src/components/Dialog/ProductDialog.css), [`Recording.css`](../../src/components/Recording/Recording.css), [`Billing.css`](../../src/components/Billing/Billing.css), [`Settings.css`](../../src/components/Settings/Settings.css), [`Feedback.css`](../../src/components/Feedback/Feedback.css), [`LandingPage.jsx`](../../src/components/LandingPage/LandingPage.jsx), [`LandingPage.css`](../../src/components/LandingPage/LandingPage.css), and [`CookieConsent.css`](../../src/components/CookieConsent/CookieConsent.css). Native constraints and current divergence are derived from [`knowledge/architecture/platform-divergence.md`](../architecture/platform-divergence.md), historical `origin/cap-and`/`origin/cap-ios` branches, Capacitor configuration, Android manifest, iOS plist, and the UI/UX review checklist used for touch, safe-area, dynamic-text, accessibility, and reduced-motion validation.

The code and the visually verified Recent Notes implementation outrank generic design-system recommendations where they conflict. This guide also incorporates repository requirements for responsive behavior, keyboard access, the shared `48` logical-unit target with explicit legacy exceptions, reduced motion, safe areas, dynamic text, and documentation maintenance. No secret, credential, patient, note, or transcript content is included.
