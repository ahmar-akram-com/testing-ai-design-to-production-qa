# [QA]: Exact Figma typography and spacing tokens unavailable for pixel QA

## Summary

The blog page implementation uses visual approximation from the public Figma embed because inspect-level node data, design tokens, and exact layer measurements were not available in this environment.

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
- Open the implemented blog page locally.

## Steps To Reproduce

1. Attempt to inspect exact typography, spacing, color, and frame dimensions for node `13331:2`.
2. Compare the implementation against the accessible Figma embed screenshot.
3. Record any values that cannot be verified exactly.

## Actual Result

The Figma file can be viewed through the embed, but exact inspect data was not available. Pixel-level QA is based on screenshot comparison and extracted assets.

## Expected Result

QA should validate exact font sizes, line heights, spacing, frame widths, image dimensions, and color tokens against Figma inspect data.

## Impact

Design fidelity risk remains because small typography and spacing mismatches cannot be confirmed or corrected with precision.

## Evidence

- Local checklist: `docs/frontend-ui-ux-testing.md`
- Local issue log: `docs/qa-issues-log.md`

## Acceptance Criteria

- [ ] Figma inspect or MCP node data is available for the supplied node.
- [ ] Typography, spacing, color, and frame dimensions are compared against exact design values.
- [ ] Any deviations are corrected or explicitly approved.

