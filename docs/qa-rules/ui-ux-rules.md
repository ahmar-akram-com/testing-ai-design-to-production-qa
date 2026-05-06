# UI/UX QA Rules

## Visual Fidelity

- Compare layout structure, section order, spacing, alignment, typography, color, imagery, and component sizing against the Figma frame.
- Flag any missing or substituted images unless explicitly approved.
- Flag visible differences in header, navigation, article hero, article body, sidebars, related content, CTAs, and footer.
- Flag text wrapping that materially changes hierarchy or scanability.

## Responsive Behavior

- Verify desktop, tablet, and mobile viewports.
- Flag horizontal overflow at 320px and above.
- Flag sticky headers, sidebars, menus, cards, and media that overlap content.
- Confirm mobile content order remains logical and scannable.

## Accessibility

- Enforce WCAG 2.2 A/AA automated checks where tool coverage exists, with WCAG 2.1 A/AA automated tags retained for axe compatibility.
- Require one logical `h1`, sequential headings, visible focus states, keyboard access, semantic landmarks, and useful alt text.
- Flag low contrast, missing accessible names, empty controls, keyboard traps, and focus order defects.

## Interaction UX

- Verify hover, focus, active, selected, expanded, and loading states.
- Confirm menus expose state with `aria-expanded`.
- Confirm links and CTAs use real destinations before production release.
- Flag console errors that appear during normal page load or basic interactions.

## Content QA

- Verify spelling, grammar, capitalization, labels, metadata, dates, headings, and CTA copy.
- Flag placeholder copy, lorem ipsum, empty links, and stale metadata.

## Performance UX

- Flag missing image dimensions, layout shift risk, failed assets, slow network failures, and excessive page weight.
- Confirm screenshots, DOM, CSS summary, and console/network evidence are captured for every QA run.

