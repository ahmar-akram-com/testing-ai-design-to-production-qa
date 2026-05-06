import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function captureViewport(browser, config, viewport) {
  const outputDir = path.join(config.outputDir, 'website', viewport.name);
  await fs.mkdir(outputDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: Boolean(viewport.isMobile),
    deviceScaleFactor: viewport.isMobile ? 2 : 1,
    ...(config.httpAuth.username && config.httpAuth.password
      ? {
          httpCredentials: {
            username: config.httpAuth.username,
            password: config.httpAuth.password,
          },
        }
      : {}),
  });
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];

  page.on('console', (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || '',
    });
  });

  let response = null;
  let navigationError = '';

  try {
    response = await page.goto(config.targetUrl, {
      waitUntil: 'networkidle',
      timeout: 45_000,
    });
  } catch (error) {
    navigationError = error.message;
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.setContent(`
      <!doctype html>
      <html lang="en">
        <head><title>Target unavailable</title></head>
        <body>
          <main>
            <h1>Target unavailable</h1>
            <p>${error.message}</p>
          </main>
        </body>
      </html>
    `);
  }

  await page.waitForTimeout(500);

  const screenshotPath = path.join(outputDir, 'screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const dom = await page.evaluate(() => {
    const text = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const all = [...document.querySelectorAll('*')];

    return {
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      metaViewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
      url: window.location.href,
      status: document.readyState,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((node) => ({
        tag: node.tagName.toLowerCase(),
        text: text(node.textContent),
      })),
      links: [...document.querySelectorAll('a')].map((node) => ({
        text: text(node.textContent),
        href: node.getAttribute('href') || '',
        ariaLabel: node.getAttribute('aria-label') || '',
        target: node.getAttribute('target') || '',
        rel: node.getAttribute('rel') || '',
        hasImage: Boolean(node.querySelector('img')),
        imageAlt: node.querySelector('img')?.getAttribute('alt') ?? null,
        imageSrc: node.querySelector('img')?.currentSrc || node.querySelector('img')?.src || '',
      })),
      images: [...document.querySelectorAll('img')].map((node) => ({
        src: node.currentSrc || node.src,
        alt: node.getAttribute('alt'),
        className: String(node.className || ''),
        parentTag: node.parentElement?.tagName.toLowerCase() || '',
        parentClassName: String(node.parentElement?.className || ''),
        parentHref: node.closest('a')?.getAttribute('href') || '',
        width: node.naturalWidth,
        height: node.naturalHeight,
        renderedWidth: Math.round(node.getBoundingClientRect().width),
        renderedHeight: Math.round(node.getBoundingClientRect().height),
      })),
      buttons: [...document.querySelectorAll('button')].map((node) => ({
        text: text(node.textContent),
        ariaLabel: node.getAttribute('aria-label') || '',
        ariaExpanded: node.getAttribute('aria-expanded') || '',
      })),
      landmarks: ['header', 'nav', 'main', 'article', 'aside', 'footer'].reduce((acc, tag) => {
        acc[tag] = document.querySelectorAll(tag).length;
        return acc;
      }, {}),
      forms: [...document.querySelectorAll('form')].map((form) => ({
        action: form.getAttribute('action') || '',
        method: form.getAttribute('method') || 'get',
        inputs: [...form.querySelectorAll('input,textarea,select,button')].map((node) => ({
          tag: node.tagName.toLowerCase(),
          type: node.getAttribute('type') || '',
          name: node.getAttribute('name') || '',
          required: Boolean(node.required),
          placeholder: node.getAttribute('placeholder') || '',
          ariaLabel: node.getAttribute('aria-label') || '',
          text: text(node.textContent),
        })),
      })),
      controls: [...document.querySelectorAll('input,textarea,select,button')].map((node) => ({
        tag: node.tagName.toLowerCase(),
        type: node.getAttribute('type') || '',
        name: node.getAttribute('name') || '',
        required: Boolean(node.required),
        placeholder: node.getAttribute('placeholder') || '',
        ariaLabel: node.getAttribute('aria-label') || '',
        text: text(node.textContent),
      })),
      css: all.slice(0, 500).map((node) => {
        const styles = window.getComputedStyle(node);
        return {
          tag: node.tagName.toLowerCase(),
          id: node.id || '',
          className: String(node.className || ''),
          text: text(node.textContent).slice(0, 120),
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          display: styles.display,
        };
      }),
    };
  });

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const scan = {
    viewport,
    statusCode: response?.status() || null,
    screenshotPath,
    domPath: path.join(outputDir, 'dom.json'),
    axePath: path.join(outputDir, 'axe.json'),
    consolePath: path.join(outputDir, 'console.json'),
    dom,
    axe: {
      violations: axe.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      })),
    },
    consoleMessages,
    failedRequests,
    navigationError,
  };

  await writeJson(scan.domPath, dom);
  await writeJson(scan.axePath, scan.axe);
  await writeJson(scan.consolePath, { consoleMessages, failedRequests });

  await context.close();
  return scan;
}

export async function scanWebsite(config) {
  const outputDir = path.join(config.outputDir, 'website');
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch();
  const scans = [];

  try {
    for (const viewport of config.viewports) {
      scans.push(await captureViewport(browser, config, viewport));
    }
  } finally {
    await browser.close();
  }

  await writeJson(path.join(outputDir, 'website-summary.json'), { scans });
  return { scans, outputDir };
}
