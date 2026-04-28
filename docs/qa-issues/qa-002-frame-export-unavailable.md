# [QA]: High-resolution target frame export unavailable for visual diff QA

## Summary

The page uses images extracted from the Figma asset batch, but the exact target frame export could not be generated for side-by-side image diffing.

## Environment

- Page: Rival blog page
- Build/commit: Local implementation
- Browser/device: Chrome via Playwright
- Viewport: Desktop 1440px and mobile Pixel 7
- Figma reference: https://www.figma.com/design/EXV5Pmw3DFPKyUwVvM6rZP/Rival-Website?node-id=13331-2&p=f&t=fy1LQiasuW4JTImj-0

## Severity / Priority

- Severity: Medium
- Priority: P1

## Preconditions

- Open the supplied Figma URL.
- Load the implemented blog page.

## Steps To Reproduce

1. Attempt to export the target blog frame from Figma.
2. Compare the implementation against the accessible Figma embed.
3. Review image crops, vertical spacing, footer layout, and related content.

## Actual Result

Available comparison is the Figma embed canvas screenshot, where the target frame is zoomed out and difficult to inspect at exact pixel level.

## Expected Result

QA should compare the implementation against a high-resolution PNG export of the target blog page frame.

## Impact

Visual mismatch risk remains for spacing, image crops, card sizing, and footer structure.

## Evidence

- Local checklist: `docs/frontend-ui-ux-testing.md`
- Local issue log: `docs/qa-issues-log.md`

## Acceptance Criteria

- [ ] A high-resolution PNG export of the target blog frame is attached.
- [ ] Desktop and mobile screenshots are compared with a documented visual diff.
- [ ] Mismatched imagery, cropping, and spacing are corrected or approved.

