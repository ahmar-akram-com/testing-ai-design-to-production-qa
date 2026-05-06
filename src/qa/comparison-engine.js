import fs from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

function issue({
  title,
  severity = 'Medium',
  priority = 'P2',
  summary,
  actual,
  expected,
  impact,
  evidence = [],
  acceptance = [],
  viewport = '',
  screenshots = [],
  ruleRefs = [],
}) {
  return {
    title,
    severity,
    priority,
    summary,
    actual,
    expected,
    impact,
    evidence: [...new Set(evidence.filter(Boolean))],
    acceptance,
    viewport,
    screenshots: [...new Set(screenshots.filter(Boolean))],
    ruleRefs,
  };
}

function ruleTitle(rule) {
  return path.basename(rule.file || 'QA rule file');
}

function ruleBullets(rules) {
  return rules.flatMap((rule) =>
    String(rule.content || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^[-*]\s+/.test(line))
      .map((line) => ({
        file: rule.file,
        title: ruleTitle(rule),
        text: line.replace(/^[-*]\s+/, ''),
      })),
  );
}

function matchRuleRefs(issueDraft, ruleIndex = []) {
  const haystack = `${issueDraft.title} ${issueDraft.summary} ${issueDraft.expected}`.toLowerCase();
  const tokens = [
    'figma',
    'design',
    'logo',
    'external',
    'noopener',
    'heading',
    'metadata',
    'title',
    'description',
    'image',
    'alt',
    'link',
    'responsive',
    'overflow',
    'accessibility',
    'wcag',
    'console',
    'network',
    'security',
    'header',
  ].filter((token) => haystack.includes(token));

  const matches = ruleIndex
    .filter((rule) => tokens.some((token) => rule.text.toLowerCase().includes(token)))
    .slice(0, 4);

  return matches.map((match) => `${match.title}: ${match.text}`);
}

function fromScan(scan, data, ruleIndex) {
  const draft = {
    ...data,
    viewport: scan.viewport.name,
    screenshots: [scan.screenshotPath],
    evidence: [...(data.evidence || []), scan.screenshotPath],
  };

  return issue({
    ...draft,
    ruleRefs: data.ruleRefs || matchRuleRefs(draft, ruleIndex),
  });
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

function isExternalHref(href, pageUrl) {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  try {
    const linkUrl = new URL(href, pageUrl);
    const currentUrl = new URL(pageUrl);
    return ['http:', 'https:'].includes(linkUrl.protocol) && linkUrl.origin !== currentUrl.origin;
  } catch {
    return false;
  }
}

function findExternalLinksWithoutNewTab(scan) {
  return scan.dom.links.filter((link) => isExternalHref(link.href, scan.dom.url) && link.target !== '_blank');
}

function findExternalLinksWithoutNoopener(scan) {
  return scan.dom.links.filter((link) => {
    if (!isExternalHref(link.href, scan.dom.url) || link.target !== '_blank') {
      return false;
    }

    return !String(link.rel || '').split(/\s+/).includes('noopener');
  });
}

function findLogoImages(scan) {
  return scan.dom.images.filter((image) => {
    const marker = `${image.className || ''} ${image.parentClassName || ''} ${image.parentHref || ''}`.toLowerCase();
    return marker.includes('logo') || marker.includes('brand');
  });
}

function findLogoIssues(scan) {
  return findLogoImages(scan).reduce(
    (acc, image) => {
      const extension = image.src.split('?')[0].split('.').pop()?.toLowerCase() || '';

      if (!image.parentHref) {
        acc.notLinked.push(image);
      }

      if (!['png', 'svg', 'webp'].includes(extension)) {
        acc.invalidFormat.push(image);
      }

      if (!image.alt || !/(rival|company|site)/i.test(image.alt)) {
        acc.altText.push(image);
      }

      return acc;
    },
    { notLinked: [], invalidFormat: [], altText: [] },
  );
}

function headingLevel(tag) {
  return Number(tag.replace('h', ''));
}

function findSkippedHeadingLevels(scan) {
  const skipped = [];
  let previous = 0;

  for (const heading of scan.dom.headings) {
    const current = headingLevel(heading.tag);
    if (previous && current - previous > 1) {
      skipped.push({ previous, current, text: heading.text });
    }
    previous = current;
  }

  return skipped;
}

function findChecklistIssues(scan, ruleIndex = []) {
  const issues = [];
  const externalWithoutNewTab = findExternalLinksWithoutNewTab(scan);
  const externalWithoutNoopener = findExternalLinksWithoutNoopener(scan);
  const logoIssues = findLogoIssues(scan);
  const skippedHeadings = findSkippedHeadingLevels(scan);

  if (!scan.dom.title || scan.dom.title.length < 8) {
    issues.push(
      fromScan(scan, {
        title: `[QA Checklist]: Page title metadata is missing or too short on ${scan.viewport.name}`,
        severity: 'Medium',
        priority: 'P2',
        summary: 'The client QA checklist requires the title tag to be present and properly formatted.',
        actual: scan.dom.title || 'No title found.',
        expected: 'A unique, relevant, production-ready title tag should be present.',
        impact: 'Weak metadata reduces SEO quality, sharing clarity, and browser tab usability.',
        evidence: [scan.domPath],
        acceptance: ['Page title is unique, relevant, and descriptive.'],
      }, ruleIndex),
    );
  }

  if (!scan.dom.metaDescription || scan.dom.metaDescription.length < 40) {
    issues.push(
      fromScan(scan, {
        title: `[QA Checklist]: Meta description is missing or too short on ${scan.viewport.name}`,
        severity: 'Medium',
        priority: 'P2',
        summary: 'The client QA checklist requires meta tags to be in proper format.',
        actual: scan.dom.metaDescription || 'No meta description found.',
        expected: 'A relevant meta description should summarize the page content.',
        impact: 'Missing descriptions reduce SEO and social preview quality.',
        evidence: [scan.domPath],
        acceptance: ['Meta description is present, unique, and relevant to the page.'],
      }, ruleIndex),
    );
  }

  if (externalWithoutNewTab.length) {
    issues.push(
      fromScan(scan, {
        title: `[QA Checklist]: External links should open in a new tab on ${scan.viewport.name}`,
        severity: 'Medium',
        priority: 'P2',
        summary: `${externalWithoutNewTab.length} external links do not use target="_blank".`,
        actual: externalWithoutNewTab
          .map((link) => `${link.text || link.ariaLabel || link.href} -> ${link.href}`)
          .slice(0, 12)
          .join('\n'),
        expected: 'All external links should open in a new tab per the client QA checklist.',
        impact: 'External navigation can pull users away from the implemented page unexpectedly.',
        evidence: [scan.domPath],
        acceptance: ['Every external link uses target="_blank".', 'Internal section/page links continue to open normally.'],
      }, ruleIndex),
    );
  }

  if (externalWithoutNoopener.length) {
    issues.push(
      fromScan(scan, {
        title: `[QA Checklist]: External new-tab links should use noopener on ${scan.viewport.name}`,
        severity: 'Low',
        priority: 'P3',
        summary: `${externalWithoutNoopener.length} external new-tab links are missing rel="noopener".`,
        actual: externalWithoutNoopener
          .map((link) => `${link.text || link.ariaLabel || link.href} -> rel="${link.rel || ''}"`)
          .slice(0, 12)
          .join('\n'),
        expected: 'External links opened in a new tab should include rel="noopener".',
        impact: 'Missing noopener weakens security isolation for external tabs.',
        evidence: [scan.domPath],
        acceptance: ['External target="_blank" links include rel="noopener".'],
      }, ruleIndex),
    );
  }

  if (logoIssues.notLinked.length) {
    issues.push(
      fromScan(scan, {
        title: `[QA Checklist]: Logo should be clickable on ${scan.viewport.name}`,
        severity: 'Medium',
        priority: 'P2',
        summary: `${logoIssues.notLinked.length} logo images are not wrapped in homepage links.`,
        actual: logoIssues.notLinked.map((image) => image.src).join('\n'),
        expected: 'Logo should be clickable and link to the homepage.',
        impact: 'Users expect logo clicks to return to the homepage.',
        evidence: [scan.domPath],
        acceptance: ['All logo instances link to the approved homepage URL.'],
      }, ruleIndex),
    );
  }

  if (logoIssues.invalidFormat.length) {
    issues.push(
      fromScan(scan, {
        title: `[QA Checklist]: Logo should use PNG, SVG, or WebP on ${scan.viewport.name}`,
        severity: 'Low',
        priority: 'P3',
        summary: `${logoIssues.invalidFormat.length} logo images use a non-preferred format.`,
        actual: logoIssues.invalidFormat.map((image) => image.src).join('\n'),
        expected: 'Logo assets should use PNG, SVG, or WebP per the client QA checklist.',
        impact: 'Non-preferred logo formats can reduce sharpness or optimization quality.',
        evidence: [scan.domPath],
        acceptance: ['Logo files use PNG, SVG, or WebP and remain sharp across device densities.'],
      }, ruleIndex),
    );
  }

  if (logoIssues.altText.length) {
    issues.push(
      fromScan(scan, {
        title: `[QA Checklist]: Logo alt text should include site or company name on ${scan.viewport.name}`,
        severity: 'Medium',
        priority: 'P2',
        summary: `${logoIssues.altText.length} logo images do not have descriptive company/site alt text.`,
        actual: logoIssues.altText.map((image) => `${image.src} -> alt="${image.alt || ''}"`).join('\n'),
        expected: 'Logo alt text should include the site name or company name.',
        impact: 'Screen reader users may not receive the brand identity from logo images.',
        evidence: [scan.domPath],
        acceptance: ['Logo alt text includes the site name or company name, or the linked logo has an equivalent accessible name approved by QA.'],
      }, ruleIndex),
    );
  }

  if (skippedHeadings.length) {
    issues.push(
      fromScan(scan, {
        title: `[QA Checklist]: Heading hierarchy skips levels on ${scan.viewport.name}`,
        severity: 'Medium',
        priority: 'P2',
        summary: `${skippedHeadings.length} heading hierarchy skips were detected.`,
        actual: skippedHeadings.map((item) => `h${item.previous} -> h${item.current}: ${item.text}`).join('\n'),
        expected: 'Headings should follow a logical h1 to h6 order.',
        impact: 'Skipped heading levels can reduce scanability, accessibility, and SEO quality.',
        evidence: [scan.domPath],
        acceptance: ['Heading levels follow a logical hierarchy without skipped levels.'],
      }, ruleIndex),
    );
  }

  return issues;
}

function collectPreflightIssues(preflight) {
  if (!preflight) {
    return [];
  }

  const issues = [];
  const developedUrl = preflight.urls?.find((item) => item.name === 'Developed page URL');
  const figmaUrl = preflight.urls?.find((item) => item.name === 'Figma design URL');
  const inaccessibleFiles = preflight.files?.filter((file) => !file.accessible) || [];

  if (developedUrl && !developedUrl.accessible) {
    issues.push(
      issue({
        title: '[Security]: Developed page URL is not accessible during preflight',
        severity: developedUrl.requiresAuthentication ? 'High' : 'Medium',
        priority: developedUrl.requiresAuthentication ? 'P1' : 'P2',
        summary: `Preflight could not access the developed URL. Status: ${developedUrl.status || 'unavailable'}.`,
        actual: developedUrl.error || `HTTP status ${developedUrl.status}. Auth challenge: ${developedUrl.authChallenge || 'none'}.`,
        expected: 'Developed page URL should be reachable before visual and checklist comparison runs. If HTTP authentication is required, provide valid HTTP_AUTH_USERNAME and HTTP_AUTH_PASSWORD.',
        impact: 'Visual capture, DOM extraction, and UI/UX accuracy are reduced when the target page is blocked or authenticated without credentials.',
        evidence: [preflight.outputPath],
        acceptance: [
          'Target URL returns a successful HTTP status during preflight.',
          'Protected targets provide valid HTTP basic auth credentials to the QA runner.',
          'Rerun npm run qa:design and confirm the developed page is accessible.',
        ],
      }),
    );
  }

  if (figmaUrl && !figmaUrl.accessible) {
    issues.push(
      issue({
        title: '[Security]: Figma design URL accessibility preflight failed',
        severity: figmaUrl.requiresAuthentication ? 'Medium' : 'Low',
        priority: 'P2',
        summary: `Preflight could not confirm browser access to the Figma design URL. Status: ${figmaUrl.status || 'unavailable'}.`,
        actual: figmaUrl.error || `HTTP status ${figmaUrl.status}. Auth challenge: ${figmaUrl.authChallenge || 'none'}.`,
        expected: 'The Figma design URL should be reachable, and exact extraction should use FIGMA_TOKEN with file access.',
        impact: 'QA can continue with available data, but design-source confidence is lower until access is confirmed.',
        evidence: [preflight.outputPath],
        acceptance: [
          'Figma design URL is accessible to the QA environment or FIGMA_TOKEN provides exact file access.',
          'Rerun npm run qa:design and verify Figma preflight and extraction status.',
        ],
      }),
    );
  }

  if (preflight.figmaApi && !preflight.figmaApi.accessible) {
    issues.push(
      issue({
        title: '[Security]: Figma API authentication is unavailable',
        severity: 'Medium',
        priority: 'P1',
        summary: 'Exact Figma node extraction cannot run because API authentication or node access is unavailable.',
        actual: preflight.figmaApi.error || `Figma API status ${preflight.figmaApi.status}.`,
        expected: 'FIGMA_TOKEN should have access to the exact Figma file and node under test.',
        impact: 'Pixel, typography, spacing, and color accuracy are limited without exact Figma node data.',
        evidence: [preflight.outputPath],
        acceptance: ['Set FIGMA_TOKEN with file access.', 'Confirm FIGMA_FILE_KEY and FIGMA_NODE_ID are correct.'],
      }),
    );
  }

  if (inaccessibleFiles.length) {
    issues.push(
      issue({
        title: '[Security]: One or more Markdown checklist files are not accessible',
        severity: 'Medium',
        priority: 'P2',
        summary: `${inaccessibleFiles.length} Markdown rule/checklist files could not be read.`,
        actual: inaccessibleFiles.map((file) => `${file.file}: ${file.error}`).join('\n'),
        expected: 'All QA rule and checklist files should be readable before comparison so the full dataset is applied.',
        impact: 'Checklist coverage and result accuracy can be incomplete if rule files are missing or locked.',
        evidence: [preflight.outputPath],
        acceptance: ['All configured Markdown checklist/rule files are readable.', 'Rerun npm run qa:design and verify preflight file access passes.'],
      }),
    );
  }

  for (const urlCheck of preflight.urls || []) {
    for (const finding of urlCheck.securityFindings || []) {
      const exposedSecret = finding.includes('Potential exposed');
      issues.push(
        issue({
          title: `[Security]: ${urlCheck.name} - ${finding}`,
          severity: exposedSecret || finding.includes('HTTPS') || finding.includes('Strict-Transport-Security') ? 'Medium' : 'Low',
          priority: exposedSecret ? 'P1' : 'P3',
          summary: finding,
          actual: `${urlCheck.url} response headers: ${JSON.stringify(urlCheck.headers)}`,
          expected: exposedSecret
            ? 'Client HTML should not expose tokens, API keys, credentials, or secret-like values.'
            : 'Developed pages should expose baseline security headers appropriate for the deployment environment.',
          impact: exposedSecret
            ? 'Exposed token-like values in browser-delivered HTML can weaken access control and should be removed or replaced with server-side session handling.'
            : 'Missing security headers can weaken browser protections or deployment readiness.',
          evidence: [preflight.outputPath],
          acceptance: exposedSecret
            ? ['Remove token-like values from browser-delivered HTML.', 'Use server-side credentials or short-lived session APIs where authentication is required.', 'Rerun npm run qa:design and confirm content security findings are clear.']
            : ['Security header policy is configured or the missing header is documented as intentionally omitted for local development.'],
        }),
      );
    }
  }

  return issues;
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

export async function compareDesignToWebsite({ figma, website, config, preflight, rules = [] }) {
  const issues = [];
  const comparisonDir = path.join(config.outputDir, 'comparison');
  const ruleIndex = ruleBullets(rules);
  await fs.mkdir(comparisonDir, { recursive: true });

  issues.push(...collectPreflightIssues(preflight));

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
        fromScan(scan, {
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
        }, ruleIndex),
      );
      continue;
    }

    const overflow = scan.dom.scroll.width - scan.dom.viewport.width;
    if (overflow > 1) {
      issues.push(
        fromScan(scan, {
          title: `[QA]: Horizontal overflow detected on ${scan.viewport.name}`,
          severity: 'High',
          priority: 'P1',
          summary: `The page scroll width exceeds the viewport width by ${overflow}px.`,
          actual: `Viewport width: ${scan.dom.viewport.width}px. Document scroll width: ${scan.dom.scroll.width}px.`,
          expected: 'The page should not create horizontal scrolling at supported viewport widths.',
          impact: 'Horizontal overflow creates a broken mobile and tablet reading experience.',
          evidence: [scan.screenshotPath, scan.domPath],
          acceptance: ['No horizontal overflow at 320px and above.', 'All content remains readable without side-scrolling.'],
        }, ruleIndex),
      );
    }

    if (scan.axe.violations.length) {
      issues.push(
        fromScan(scan, {
          title: `[QA]: Accessibility violations detected on ${scan.viewport.name}`,
          severity: 'High',
          priority: 'P1',
          summary: `${scan.axe.violations.length} axe WCAG 2.1 A/AA violation groups were found.`,
          actual: scan.axe.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
          expected: 'No WCAG 2.1 A/AA violations should be present in automated axe checks.',
          impact: 'Accessibility issues may block keyboard, screen reader, low vision, or compliance requirements.',
          evidence: [scan.axePath, scan.screenshotPath],
          acceptance: ['Automated axe scan returns zero violations.', 'Manual keyboard and screen reader smoke checks pass.'],
        }, ruleIndex),
      );
    }

    const errors = scan.consoleMessages.filter((message) => ['error', 'warning'].includes(message.type));
    if (errors.length || scan.failedRequests.length) {
      issues.push(
        fromScan(scan, {
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
        }, ruleIndex),
      );
    }

    const h1s = scan.dom.headings.filter((heading) => heading.tag === 'h1');
    if (h1s.length !== 1) {
      issues.push(
        fromScan(scan, {
          title: `[QA]: Page should have exactly one H1 on ${scan.viewport.name}`,
          severity: 'Medium',
          priority: 'P2',
          summary: `Found ${h1s.length} H1 elements.`,
          actual: JSON.stringify(h1s),
          expected: 'Each page should expose exactly one primary H1.',
          impact: 'Incorrect heading structure reduces accessibility and SEO quality.',
          evidence: [scan.domPath],
          acceptance: ['Exactly one descriptive H1 is present.', 'Heading levels follow a logical order.'],
        }, ruleIndex),
      );
    }

    const placeholderLinks = findPlaceholderLinks(scan);
    if (placeholderLinks.length) {
      issues.push(
        fromScan(scan, {
          title: `[QA]: Placeholder links detected on ${scan.viewport.name}`,
          severity: 'Low',
          priority: 'P2',
          summary: `${placeholderLinks.length} links use empty or placeholder destinations.`,
          actual: placeholderLinks.map((link) => `${link.text || link.ariaLabel || 'Untitled'} -> ${link.href || '(empty)'}`).join('\n'),
          expected: 'All production links should route to real pages, sections, or actions.',
          impact: 'Users may hit dead ends and conversion paths may be incomplete.',
          evidence: [scan.domPath],
          acceptance: ['All header, footer, CTA, and card links point to approved destinations.'],
        }, ruleIndex),
      );
    }

    const missingAlt = findMissingImageAlts(scan);
    if (missingAlt.length) {
      issues.push(
        fromScan(scan, {
          title: `[QA]: Images missing alt attributes on ${scan.viewport.name}`,
          severity: 'Medium',
          priority: 'P2',
          summary: `${missingAlt.length} images do not have alt attributes.`,
          actual: missingAlt.map((image) => image.src).slice(0, 12).join('\n'),
          expected: 'Informative images need meaningful alt text; decorative images need empty alt attributes.',
          impact: 'Screen reader users may miss meaningful visual content or hear noisy file names.',
          evidence: [scan.domPath],
          acceptance: ['Every image has either meaningful alt text or an intentional empty alt attribute.'],
        }, ruleIndex),
      );
    }

    issues.push(...findChecklistIssues(scan, ruleIndex));
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
