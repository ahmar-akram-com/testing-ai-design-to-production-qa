import fs from 'node:fs/promises';
import path from 'node:path';

function basicAuthHeader(username, password) {
  if (!username || !password) {
    return '';
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function redact(value = '') {
  return String(value)
    .replace(/(token=)[^&\s]+/gi, '$1[redacted]')
    .replace(/(key=)[^&\s]+/gi, '$1[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/Basic\s+[A-Za-z0-9+/=]+/g, 'Basic [redacted]');
}

function publicHeaders(headers) {
  const keep = [
    'cache-control',
    'content-security-policy',
    'content-type',
    'location',
    'referrer-policy',
    'strict-transport-security',
    'www-authenticate',
    'x-content-type-options',
    'x-frame-options',
  ];

  return keep.reduce((acc, key) => {
    const value = headers.get(key);
    if (value) {
      acc[key] = redact(value);
    }
    return acc;
  }, {});
}

function securityHeaderFindings(headers, url) {
  const findings = [];
  const parsedUrl = new URL(url);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname);

  if (!isLocal && parsedUrl.protocol !== 'https:') {
    findings.push('Non-local developed URLs should use HTTPS.');
  }

  if (!isLocal && !headers.get('strict-transport-security')) {
    findings.push('Missing Strict-Transport-Security header on non-local HTTPS target.');
  }

  if (!headers.get('x-content-type-options')) {
    findings.push('Missing X-Content-Type-Options header.');
  }

  if (!headers.get('referrer-policy')) {
    findings.push('Missing Referrer-Policy header.');
  }

  if (!headers.get('content-security-policy')) {
    findings.push('Missing Content-Security-Policy header.');
  }

  return findings;
}

function sensitiveHtmlFindings(html = '') {
  const checks = [
    {
      label: 'Potential exposed JWT in client HTML.',
      pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    },
    {
      label: 'Potential exposed GitHub token in client HTML.',
      pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/i,
    },
    {
      label: 'Potential exposed secret-like assignment in client HTML.',
      pattern: /\b(api[_-]?key|access[_-]?token|secret|password)\b\s*[:=]\s*["'][^"']{12,}["']/i,
    },
  ];

  return checks
    .filter((check) => check.pattern.test(html))
    .map((check) => check.label);
}

async function checkHttpUrl({ name, url, authHeader = '', includeSecurityHeaders = false }) {
  const result = {
    name,
    url: redact(url),
    accessible: false,
    status: null,
    finalUrl: '',
    requiresAuthentication: false,
    authChallenge: '',
    authProvided: Boolean(authHeader),
    method: '',
    headers: {},
    securityFindings: [],
    contentFindings: [],
    error: '',
  };

  if (!url) {
    result.error = 'URL is missing.';
    return result;
  }

  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        headers: authHeader ? { Authorization: authHeader } : {},
      });

      result.status = response.status;
      result.finalUrl = redact(response.url);
      result.method = method;
      result.headers = publicHeaders(response.headers);
      result.authChallenge = response.headers.get('www-authenticate') || '';
      result.requiresAuthentication = [401, 403].includes(response.status) || Boolean(result.authChallenge);
      result.accessible = response.ok;

      if (includeSecurityHeaders) {
        result.securityFindings = securityHeaderFindings(response.headers, url);
      }

      if (response.ok && method === 'GET') {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          const html = await response.text();
          result.contentFindings = sensitiveHtmlFindings(html);
          result.securityFindings = [...result.securityFindings, ...result.contentFindings];
        }
      }

      if ((response.ok && (!includeSecurityHeaders || method === 'GET')) || method === 'GET') {
        return result;
      }
    } catch (error) {
      result.error = error.message;
      if (method === 'GET') {
        return result;
      }
    }
  }

  return result;
}

function dashboardUrlFor(targetUrl) {
  try {
    const url = new URL(targetUrl);
    if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      return '';
    }
    return new URL('/dashboard.html', url).toString();
  } catch {
    return '';
  }
}

async function checkLocalFile(rule) {
  try {
    const stat = await fs.stat(rule.file);
    return {
      name: path.basename(rule.file),
      file: rule.file,
      accessible: true,
      bytes: stat.size,
      error: '',
    };
  } catch (error) {
    return {
      name: path.basename(rule.file),
      file: rule.file,
      accessible: false,
      bytes: 0,
      error: error.message,
    };
  }
}

async function checkFigmaApi(config) {
  const result = {
    name: 'Figma API node access',
    accessible: false,
    status: null,
    requiresAuthentication: true,
    authProvided: Boolean(config.figmaToken),
    error: '',
  };

  if (!config.figmaToken) {
    result.error = 'FIGMA_TOKEN is missing.';
    return result;
  }

  if (!config.figmaFileKey || !config.figmaNodeId) {
    result.error = 'FIGMA_FILE_KEY or FIGMA_NODE_ID is missing.';
    return result;
  }

  const url = `https://api.figma.com/v1/files/${config.figmaFileKey}/nodes?ids=${encodeURIComponent(config.figmaNodeId)}`;
  try {
    const response = await fetch(url, { headers: { 'X-Figma-Token': config.figmaToken } });
    result.status = response.status;
    result.accessible = response.ok;
    result.requiresAuthentication = [401, 403].includes(response.status);
    if (!response.ok) {
      result.error = `Figma API returned ${response.status} ${response.statusText}.`;
    }
  } catch (error) {
    result.error = error.message;
  }

  return result;
}

export async function runSecurityPreflight(config, rules = []) {
  const outputPath = path.join(config.outputDir, 'security-preflight.json');
  const authHeader = basicAuthHeader(config.httpAuth.username, config.httpAuth.password);
  const dashboardUrl = dashboardUrlFor(config.targetUrl);
  const urls = [
    await checkHttpUrl({
      name: 'Developed page URL',
      url: config.targetUrl,
      authHeader,
      includeSecurityHeaders: true,
    }),
    ...(dashboardUrl && dashboardUrl !== config.targetUrl
      ? [
          await checkHttpUrl({
            name: 'Dashboard page URL',
            url: dashboardUrl,
            authHeader,
            includeSecurityHeaders: true,
          }),
        ]
      : []),
    await checkHttpUrl({
      name: 'Figma design URL',
      url: config.figmaUrl,
    }),
  ];

  const result = {
    generatedAt: new Date().toISOString(),
    auth: {
      basicAuthConfigured: Boolean(authHeader),
      usernameConfigured: Boolean(config.httpAuth.username),
      passwordConfigured: Boolean(config.httpAuth.password),
    },
    urls,
    figmaApi: await checkFigmaApi(config),
    files: await Promise.all(rules.map(checkLocalFile)),
  };

  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
  return { ...result, outputPath };
}
