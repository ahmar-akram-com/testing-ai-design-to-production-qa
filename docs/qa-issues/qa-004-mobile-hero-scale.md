# [QA]: Mobile hero headline consumes most of the first viewport

## Summary

On a Pixel 7 viewport, the article headline wraps into several large lines and pushes the hero image and article context below the first viewport.

## Environment

- Page: Rival blog page
- Build/commit: Local implementation
- Browser/device: Chrome via Playwright, Pixel 7 viewport
- Viewport: 412px wide
- Figma reference: https://www.figma.com/design/EXV5Pmw3DFPKyUwVvM6rZP/Rival-Website?node-id=13331-2&p=f&t=fy1LQiasuW4JTImj-0

## Severity / Priority

- Severity: Low
- Priority: P2

## Preconditions

- Open the implemented blog page on a mobile viewport between 360px and 430px.

## Steps To Reproduce

1. Open the blog page on a Pixel 7 or equivalent mobile viewport.
2. Review the first viewport from the sticky header through the hero.
3. Confirm how much article context is visible before scrolling.

## Actual Result

The headline dominates the first viewport, and the hero image plus article intro require additional scrolling.

## Expected Result

The mobile hero should preserve the editorial feel while exposing enough context above the fold to confirm the page topic and next content.

## Impact

Mobile users may need extra scrolling before confirming the page structure and beginning the article.

## Evidence

- Local screenshot generated as `local-page-mobile.png` during QA.
- Mobile Playwright viewport: Pixel 7.

## Acceptance Criteria

- [ ] Mobile typography scale is confirmed against the mobile Figma design or approved responsive spec.
- [ ] The first mobile viewport includes the article category, title, summary or metadata, and a clear hint of the next content block.
- [ ] The heading remains readable without excessive wrapping on 360px to 430px widths.
