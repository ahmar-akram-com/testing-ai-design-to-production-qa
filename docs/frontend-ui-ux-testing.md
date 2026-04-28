# Frontend UI/UX Testing Checklist

## Scope

Page under test: Rival blog article page recreated from the supplied Figma file.

Figma reference: https://www.figma.com/design/EXV5Pmw3DFPKyUwVvM6rZP/Rival-Website?node-id=13331-2&p=f&t=fy1LQiasuW4JTImj-0

Note: The Figma file was accessible through the public embed and thumbnail flow, but structured node data, design tokens, and exact layer measurements were not available in this environment. QA should treat the embed screenshot and extracted image assets as the current comparison baseline until Figma inspect access is available.

## Test Environment Matrix

| Area | Coverage |
| --- | --- |
| Browsers | Chrome, Edge, Safari, Firefox |
| Desktop widths | 1440, 1280, 1024 |
| Tablet widths | 834, 768 |
| Mobile widths | 430, 390, 375, 360, 320 |
| Input modes | Mouse, keyboard, touch |
| Assistive tech | Screen reader smoke test, browser zoom, reduced motion |
| Network | Fast 4G, slow 4G, offline fallback |

## Design Fidelity

- Verify header logo placement, nav spacing, CTA styling, and sticky behavior against Figma.
- Compare hero typography scale, line height, article title wrapping, and metadata chip spacing.
- Compare hero image crop, inline imagery, CTA artwork, related-card imagery, and footer logo usage.
- Confirm article column width, side share rail, sidebar cards, related-card grid, and footer layout.
- Validate all section spacing from hero to article body, article body to related posts, and related posts to footer.
- Check color values for text, muted text, orange accents, yellow CTA, link states, border color, and dark footer.
- Confirm border radii, button heights, card padding, image aspect ratios, and vertical rhythm.
- Identify any content or visual deviations that came from missing Figma inspect access.

## Layout And Responsiveness

- Validate no horizontal scrolling at 320px and above.
- Confirm header remains usable while sticky on desktop and mobile.
- Confirm mobile menu opens, closes, preserves focus visibility, and does not overlap critical content.
- Verify article content order on mobile: hero, article, share controls, support cards, related posts, footer.
- Check sidebar sticky behavior on desktop and static behavior on tablet/mobile.
- Confirm related cards move from three columns to one column without image distortion.
- Test browser zoom at 125%, 150%, and 200%.
- Test long text wrapping in headings, buttons, metadata chips, and footer links.

## Interaction States

- Verify hover, focus-visible, active, and disabled states where applicable.
- Confirm menu button updates `aria-expanded` and exposes hidden links when opened.
- Confirm share buttons are keyboard reachable and have accessible names.
- Validate copy/share actions give visible feedback and do not throw console errors.
- Confirm all links have meaningful destinations before production release.

## Accessibility

- Run automated checks with axe for WCAG 2.1 A/AA.
- Confirm one logical `h1` and sequential heading order.
- Confirm landmarks: header/nav/main/article/footer.
- Confirm skip link works and is visible on focus.
- Confirm image alt text is meaningful or intentionally empty for decorative media.
- Confirm text contrast passes WCAG AA in normal, hover, and focus states.
- Confirm touch targets are at least 44px where possible.
- Confirm focus order follows visual reading order.
- Confirm the page works with keyboard only.
- Confirm no content is hidden from screen readers when visually required.

## Content And Editorial QA

- Check title, deck, author, date, read time, headings, body text, captions, CTAs, and footer copy.
- Check spelling, grammar, capitalization, punctuation, and brand voice.
- Confirm article metadata matches CMS or project source of truth.
- Confirm related article labels and titles are relevant.
- Verify CTA text is clear and does not overpromise.

## Visual Assets

- Confirm all images load without broken states.
- Confirm image crops match Figma across desktop, tablet, and mobile.
- Confirm logos are sharp and not distorted.
- Confirm app store badges use correct dimensions and alt text.
- Check image file size and lazy-loading strategy before production.

## Performance And Technical UX

- Run Lighthouse or equivalent for performance, accessibility, SEO, and best practices.
- Confirm Largest Contentful Paint target is under 2.5s on a realistic network.
- Confirm Cumulative Layout Shift target is under 0.1.
- Confirm images have stable aspect ratios to prevent layout jump.
- Confirm CSS does not block interaction or cause scroll jank.
- Check console for runtime errors, warnings, missing assets, and failed network calls.

## SEO And Metadata

- Confirm page title and meta description are unique and relevant.
- Confirm canonical URL is configured when deployed.
- Confirm article structured data is added if required by the platform.
- Confirm social preview metadata uses the correct image and summary.

## Browser And Device QA

- Compare screenshots across Chrome, Edge, Safari, and Firefox.
- Test iOS Safari address-bar collapse behavior.
- Test Android Chrome sticky header and mobile menu behavior.
- Test high contrast mode and forced colors where supported.
- Test reduced motion preferences.

## QA Issue Log Template

Use this structure for every GitHub issue:

```md
## Summary

## Environment
- Page:
- Build/commit:
- Browser/device:
- Viewport:
- Figma reference:

## Severity / Priority
- Severity:
- Priority:

## Preconditions

## Steps To Reproduce
1.
2.
3.

## Actual Result

## Expected Result

## Impact

## Evidence

## Acceptance Criteria
- [ ]
```

## Severity Guide

| Severity | Definition |
| --- | --- |
| Critical | Blocks page use, purchase/contact flow, or accessibility for core users. |
| High | Major design, usability, accessibility, or functional defect on common devices. |
| Medium | Noticeable issue with workaround or lower-frequency impact. |
| Low | Polish issue, minor content issue, or edge-case mismatch. |

## Completed Local Checks

- Vite production build.
- Playwright smoke checks on desktop and mobile Chromium.
- Axe WCAG 2.1 A/AA automated scan.
- Manual comparison against the accessible Figma embed screenshot.

