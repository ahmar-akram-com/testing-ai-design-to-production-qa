# QA Issues Log

Source design: https://www.figma.com/design/EXV5Pmw3DFPKyUwVvM6rZP/Rival-Website?node-id=13331-2&p=f&t=fy1LQiasuW4JTImj-0

Repository for logged issues: https://github.com/ahmar-akram-com/testing-ai-design-to-production-qa

## QA-001: Exact Figma typography and spacing tokens are not available for final pixel QA

Status: Open

Severity: Medium

Priority: P1

Summary: The implementation uses visual approximation from the Figma embed screenshot because inspect-level node data was unavailable in this environment.

Expected Result: QA and implementation should validate exact font sizes, line heights, spacing, frame widths, and color tokens against Figma inspect data.

Actual Result: The page can only be compared against screenshots and extracted assets, which leaves a measurable design fidelity risk.

Acceptance Criteria:

- Figma inspect or MCP node data is available for the supplied node.
- Typography, spacing, color, and frame dimensions are compared against exact design values.
- Any deviations are either corrected or explicitly approved.

## QA-002: Blog page uses extracted Figma imagery but not a verified exact frame export

Status: Open

Severity: Medium

Priority: P1

Summary: The page uses images from the Figma file asset batch, but the exact target frame export could not be generated for side-by-side image diffing.

Expected Result: QA should compare the implementation against a high-resolution export of the target blog page frame.

Actual Result: Available comparison is the Figma embed canvas screenshot, where the target frame is zoomed out and partially difficult to inspect.

Acceptance Criteria:

- A high-resolution PNG export of the target blog frame is attached to the issue or repo.
- Desktop and mobile screenshots are compared with a documented visual diff.
- Any mismatched imagery, cropping, and spacing is corrected or approved.

## QA-003: Header navigation destinations are placeholder anchors pending final routing

Status: Open

Severity: Low

Priority: P2

Summary: Header and footer links are implemented as page anchors or placeholders because final production routes were not present in the empty repository.

Expected Result: Navigation links should point to real production routes or CMS-managed URLs.

Actual Result: Links currently support layout and interaction testing but do not represent final navigation behavior.

Acceptance Criteria:

- Final route map is provided.
- Header, footer, related posts, and CTA links point to real destinations.
- Link behavior is verified with keyboard, mouse, and touch.

## QA-004: Mobile hero headline consumes most of the first viewport

Status: Open

Severity: Low

Priority: P2

Summary: On a Pixel 7 viewport, the article headline wraps into several large lines and pushes the hero image and article context below the first viewport.

Expected Result: The mobile hero should preserve the expressive editorial feel while exposing enough context above the fold to confirm the page topic and next content.

Actual Result: The headline dominates the first viewport, which may reduce scannability and slow the user's path into the article.

Acceptance Criteria:

- Mobile typography scale is confirmed against the mobile Figma design or approved responsive spec.
- The first mobile viewport includes the article category, title, summary or metadata, and a clear hint of the next content block.
- The heading remains readable without excessive wrapping on 360px to 430px widths.

