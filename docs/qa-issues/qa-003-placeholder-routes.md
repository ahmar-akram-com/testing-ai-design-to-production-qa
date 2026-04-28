# [QA]: Header navigation destinations are placeholder anchors pending final routing

## Summary

Header, footer, related post, and CTA links are implemented as page anchors or placeholders because final production routes were not present in the empty repository.

## Environment

- Page: Rival blog page
- Build/commit: Local implementation
- Browser/device: Chrome via Playwright
- Viewport: Desktop 1440px and mobile Pixel 7
- Figma reference: https://www.figma.com/design/EXV5Pmw3DFPKyUwVvM6rZP/Rival-Website?node-id=13331-2&p=f&t=fy1LQiasuW4JTImj-0

## Severity / Priority

- Severity: Low
- Priority: P2

## Preconditions

- Open the implemented blog page.

## Steps To Reproduce

1. Click the brand mark, guide CTA, related article cards, and footer links.
2. Observe whether each link navigates to a real production route.
3. Repeat with keyboard navigation.

## Actual Result

Links support layout and interaction testing, but several destinations are placeholder anchors.

## Expected Result

Navigation links should point to real production routes or CMS-managed URLs.

## Impact

Users may not reach expected content or conversion paths once the page is connected to production.

## Evidence

- Header and footer anchors in `src/main.js`.
- Local checklist: `docs/frontend-ui-ux-testing.md`.

## Acceptance Criteria

- [ ] Final route map is provided.
- [ ] Header, footer, related posts, and CTA links point to real destinations.
- [ ] Link behavior is verified with keyboard, mouse, and touch.

