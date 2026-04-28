import fs from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

function issue({ title, severity = 'Medium', priority = 'P2', summary, actual, expected, impact, evidence = [], acceptance = [] }) {
  return {
    title,
    severity,
    priority,
    summary,
    actual,
    expected,
    impact,
    evidence,
    acceptance,
  };
}

async function compareScreenshots(figmaPath, websitePath, outputDir) {
  if (!figmaPath || !websitePath) {
    return null;
  }

  try {
    const figma = PNG.sync.read(await fs.readFile(figmaPath));
    const website = PNG.sync.read(await fs.readFile(websitePath));

    if (figma.width !== website.width || figma.height !== website.height) {
      return {
        comparable: false,
        reason: `Image dimensions differ. Figma: ${figma.width}x${figma.height}. Website: ${website.width}x${website.height}.`,
      };
    }

    const diff = new PNG({ width: figma.width, height: figma.height });
    const mismatchedPixels = pixelmatch(figma.data, website.data, diff.data, figma.width, figma.height, {
      threshold: 0.1,
    });
    const diffPath = path.join(outputDir, 'visual-diff.png');
    await fs.writeFile(diffPath, PNG.sync.write(diff));

    return {
      comparable: true,
      mismatchedPixels,
      totalPixels: figma.width * figma.height,
      mismatchRatio: mismatchedPixels / (figma.width * figma.height),
      diffPath,
    };
  } catch (error) {
    return {
      comparable: false,
      reason: error.message,
    };
  }
}

function findPlaceholderLinks(scan) {
  return scan.dom.links.filter((link) => {
    const href = link.href.trim();
    return !href || href === '#' || href.startsWith('javascript:');
  });
}

function findMissingImageAlts(scan) {
  return scan.dom.images.filter((image) => image.alt === null);
}

function collectTextMismatchIssues(figma, website) {
  if (!figma.available || !figma.textNodes.length) {
    return [];
  }

  const pageText = website.scans[0]?.dom?.css?.map((item) => item.text).join(' ').toLowerCase() || '';
  const missing = figma.textNodes
    .map((node) => node.text.replace(/\s+/g, ' ').trim())
    .filter((text) => text.length > 12)
    .filter((text) => !pageText.includes(text.toLowerCase()))
    .slice(0, 12);

  if (!missing.length) {
    return [];
  }

  return [
    issue({
      title: '[QA]: Figma text content is missing or changed on the website',
      severity: 'Medium',
      priority: 'P1',
      summary: 'Some text strings found in the Figma node were not found in the captured website DOM.',
      actual: `Missing sample strings: ${missing.map((item) => `"${item}"`).join(', ')}`,
      expected: 'Website content should match the approved Figma/CMS copy or document intentional copy changes.',
      impact: 'Unapproved copy mismatches can cause brand, legal, SEO, or content QA defects.',
      evidence: ['Figma node text extraction', 'Website DOM capture'],
      acceptance: [
        'All missing copy is added to the implementation, or',
        'Product/content owner approves the intentional copy differences.',
      ],
    }),
  ];
}

export async function compareDesignToWebsite({ figma, website, config }) {
  const issues = [];
  const comparisonDir = path.join(config.outputDir, 'comparison');
  await fs.mkdir(comparisonDir, { recursive: true });

  if (!figma.available) {
    issues.push(
      issue({
        title: '[QA]: Figma design data unavailable for exact comparison',
        severity: 'Medium',
        priority: 'P1',
        summary: 'The QA agent could not extract exact Figma node data for the supplied frame.',
        actual: figma.warnings.join(' ') || 'Figma extraction returned no usable node data.',
        expected: 'The agent should receive a valid FIGMA_TOKEN, FIGMA_FILE_KEY, and FIGMA_NODE_ID so exact design data can be compared.',
        impact: 'Pixel-level typography, spacing, and visual fidelity QA cannot be fully automated.',
        evidence: ['Figma extractor output', ...figma.warnings],
        acceptance: [
          'Provide a valid FIGMA_TOKEN with file access.',
          'Confirm FIGMA_FILE_KEY and FIGMA_NODE_ID point to the exact frame under test.',
          'Rerun npm run qa:design and verify Figma extraction succeeds.',
        ],
      }),
    );
  }

  for (const scan of website.scans) {
    if (scan.navigationError) {
      issues.push(
        issue({
          title: `[QA]: Target URL could not be opened on ${scan.viewport.name}`,
          severity: 'High',
          priority: 'P0',
          summary: 'Playwright could not open the target URL during the design QA run.',
          actual: scan.navigationError,
          expected: 'The target website should be reachable before design comparison runs.',
          impact: 'No reliable UI/UX comparison can be completed while the target page is unavailable.',
          evidence: [scan.screenshotPath, scan.consolePath],
          acceptance: [
            'Start the local frontend server or provide a reachable staging URL.',
            'Rerun npm run qa:design and confirm Playwright can capture the page.',
          ],
        }),
      );
      continue;
    }

    const overflow = scan.dom.scroll.width - scan.dom.viewport.width;
    if (overflow > 1) {
      issues.push(
        issue({
          title: `[QA]: Horizontal overflow detected on ${scan.viewport.name}`,
          severity: 'High',
          priority: 'P1',
          summary: `The page scroll width exceeds the viewport width by ${overflow}px.`,
          actual: `Viewport width: ${scan.dom.viewport.width}px. Document scroll width: ${scan.dom.scroll.width}px.`,
          expected: 'The page should not create horizontal scrolling at supported viewport widths.',
          impact: 'Horizontal overflow creates a broken mobile and tablet reading experience.',
          evidence: [scan.screenshotPath, scan.domPath],
          acceptance: ['No horizontal overflow at 320px and above.', 'All content remains readable without side-scrolling.'],
        }),
      );
    }

    if (scan.axe.violations.length) {
      issues.push(
        issue({
          title: `[QA]: Accessibility violations detected on ${scan.viewport.name}`,
          severity: 'High',
          priority: 'P1',
          summary: `${scan.axe.violations.length} axe WCAG 2.1 A/AA violation groups were found.`,
          actual: scan.axe.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
          expected: 'No WCAG 2.1 A/AA violations should be present in automated axe checks.',
          impact: 'Accessibility issues may block keyboard, screen reader, low vision, or compliance requirements.',
          evidence: [scan.axePath, scan.screenshotPath],
          acceptance: ['Automated axe scan returns zero violations.', 'Manual keyboard and screen reader smoke checks pass.'],
        }),
      );
    }

    const errors = scan.consoleMessages.filter((message) => ['error', 'warning'].includes(message.type));
    if (errors.length || scan.failedRequests.length) {
      issues.push(
        issue({
          title: `[QA]: Console or network errors detected on ${scan.viewport.name}`,
          severity: 'Medium',
          priority: 'P2',
          summary: 'The page emitted console warnings/errors or failed network requests during load.',
          actual: [
            ...errors.map((message) => `${message.type}: ${message.text}`),
            ...scan.failedRequests.map((request) => `request failed: ${request.url} (${request.failure})`),
          ]
            .slice(0, 12)
            .join('\n'),
          expected: 'The page should load without console errors, warnings, or failed first-party assets.',
          impact: 'Runtime errors can indicate broken interactions, missing assets, or unstable integrations.',
          evidence: [scan.consolePath],
          acceptance: ['No unexpected console errors or failed critical requests during page load.'],
        }),
      );
    }

    const h1s = scan.dom.headings.filter((heading) => heading.tag === 'h1');
    if (h1s.length !== 1) {
      issues.push(
        issue({
          title: `[QA]: Page should have exactly one H1 on ${scan.viewport.name}`,
          severity: 'Medium',
          priority: 'P2',
          summary: `Found ${h1s.length} H1 elements.`,
          actual: JSON.stringify(h1s),
          expected: 'Each page should expose exactly one primary H1.',
          impact: 'Incorrect heading structure reduces accessibility and SEO quality.',
          evidence: [scan.domPath],
          acceptance: ['Exactly one descriptive H1 is present.', 'Heading levels follow a logical order.'],
        }),
      );
    }

    const placeholderLinks = findPlaceholderLinks(scan);
    if (placeholderLinks.length) {
      issues.push(
        issue({
          title: `[QA]: Placeholder links detected on ${scan.viewport.name}`,
          severity: 'Low',
          priority: 'P2',
          summary: `${placeholderLinks.length} links use empty or placeholder destinations.`,
          actual: placeholderLinks.map((link) => `${link.text || link.ariaLabel || 'Untitled'} -> ${link.href || '(empty)'}`).join('\n'),
          expected: 'All production links should route to real pages, sections, or actions.',
          impact: 'Users may hit dead ends and conversion paths may be incomplete.',
          evidence: [scan.domPath],
          acceptance: ['All header, footer, CTA, and card links point to approved destinations.'],
        }),
      );
    }

    const missingAlt = findMissingImageAlts(scan);
    if (missingAlt.length) {
      issues.push(
        issue({
          title: `[QA]: Images missing alt attributes on ${scan.viewport.name}`,
          severity: 'Medium',
          priority: 'P2',
          summary: `${missingAlt.length} images do not have alt attributes.`,
          actual: missingAlt.map((image) => image.src).slice(0, 12).join('\n'),
          expected: 'Informative images need meaningful alt text; decorative images need empty alt attributes.',
          impact: 'Screen reader users may miss meaningful visual content or hear noisy file names.',
          evidence: [scan.domPath],
          acceptance: ['Every image has either meaningful alt text or an intentional empty alt attribute.'],
        }),
      );
    }
  }

  issues.push(...collectTextMismatchIssues(figma, website));

  const desktopScan = website.scans.find((scan) => scan.viewport.name === 'desktop');
  const visualComparison = await compareScreenshots(figma.screenshotPath, desktopScan?.screenshotPath, comparisonDir);

  if (visualComparison?.comparable && visualComparison.mismatchRatio > 0.03) {
    issues.push(
      issue({
        title: '[QA]: Visual diff exceeds approved threshold',
        severity: 'High',
        priority: 'P1',
        summary: `Visual diff mismatch ratio is ${(visualComparison.mismatchRatio * 100).toFixed(2)}%.`,
        actual: `${visualComparison.mismatchedPixels} of ${visualComparison.totalPixels} pixels differ.`,
        expected: 'Visual diff should remain within the approved threshold after accounting for dynamic content.',
        impact: 'Large visual differences indicate layout, spacing, typography, color, or asset mismatches.',
        evidence: [visualComparison.diffPath, figma.screenshotPath, desktopScan.screenshotPath],
        acceptance: ['Visual diff is under the approved threshold.', 'Intentional differences are documented.'],
      }),
    );
  } else if (visualComparison && !visualComparison.comparable) {
    issues.push(
      issue({
        title: '[QA]: Visual diff could not run because screenshot dimensions differ',
        severity: 'Medium',
        priority: 'P2',
        summary: visualComparison.reason,
        actual: 'Figma and website screenshots could not be pixel-compared directly.',
        expected: 'Capture matching viewport/frame dimensions or provide a frame export sized to the target viewport.',
        impact: 'Visual mismatch detection is less precise without pixel-level diffing.',
        evidence: [figma.screenshotPath, desktopScan?.screenshotPath].filter(Boolean),
        acceptance: ['Figma export and website screenshot dimensions match, or a documented diff normalization step is approved.'],
      }),
    );
  }

  return {
    issues,
    visualComparison,
    comparisonDir,
  };
}
