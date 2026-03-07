# Landing Page Upgrade Notes

## Completed

### Mobile Responsive Breakpoint (max-width: 768px)
- Adaptive layout using `clamp()` for fluid scaling across all mobile widths (320px–768px)
- Nav: hides nav links, shows logo + login only
- Hero: stacks vertically (text then image), diagonal green bg removed, image gets rounded frame with shadow
- Trust bar: stacks vertically, separators hidden
- Testimonials: single column card grid
- Video: full-width player, full-width CTA
- Features: single column (image on top, steps below)
- Pricing: single column stacked cards, full-width buttons
- FAQ: fluid font sizing, increased max-height for longer answers on mobile
- Footer: reduced padding

### Copy Changes
- Hero heading shortened: "not to write about it." (removed "all night")
- Hero subtext: removed "Talk to your patient like you always do." and "ready before you walk out."
- Added EHR browser messaging: "right from the same browser as your EHR."

## TODO

### Tablet Breakpoint (769px–1024px)
- Hero may need a 2-column layout with smaller image
- Testimonials could go 2-column
- Pricing could go 2-column (highlight middle card) or 3-column compact
- Nav links may need smaller font or hamburger menu at lower tablet widths

### General
- Hamburger menu for mobile nav (currently just hidden, no menu access)
- Consider lazy-loading hero image and video for mobile performance
- Test FAQ accordion on mobile — long answers may need `max-height` adjustment beyond 400px
- Desktop hero text was also updated — verify the shorter copy works at desktop too
- `temp-screenshots/` folder can be deleted once responsive work is finalized
