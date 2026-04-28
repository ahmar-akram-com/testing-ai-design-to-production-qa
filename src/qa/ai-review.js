import fs from 'node:fs/promises';
import path from 'node:path';

function summarizeIssues(issues) {
  return issues
    .map((item, index) => `${index + 1}. ${item.title}\nSeverity: ${item.severity}\nSummary: ${item.summary}`)
    .join('\n\n');
}

async function openaiReview(config, prompt) {
  if (!config.openaiApiKey || !config.openaiModel) {
    return 'OpenAI review skipped. Set OPENAI_API_KEY and OPENAI_MODEL to enable it.';
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openaiModel,
      input: prompt,
    }),
  });

  if (!response.ok) {
    return `OpenAI review failed: ${response.status} ${response.statusText}`;
  }

  const data = await response.json();
  return data.output_text || JSON.stringify(data, null, 2);
}

async function anthropicReview(config, prompt) {
  if (!config.anthropicApiKey || !config.anthropicModel) {
    return 'Claude review skipped. Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL to enable it.';
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    return `Claude review failed: ${response.status} ${response.statusText}`;
  }

  const data = await response.json();
  return data.content?.map((item) => item.text).join('\n') || JSON.stringify(data, null, 2);
}

export async function runAiReview({ config, rules, issues }) {
  const prompt = `You are reviewing a frontend design QA run.

Rules:
${rules.map((rule) => `File: ${rule.file}\n${rule.content.slice(0, 4000)}`).join('\n\n')}

Findings:
${summarizeIssues(issues) || 'No findings'}

Return:
- highest-risk UI/UX issues
- likely root causes
- concise fix recommendations
- any missing QA coverage`;

  let review = 'AI review skipped. Set AI_PROVIDER=openai or AI_PROVIDER=anthropic and provide the matching model/API key.';

  try {
    if (config.aiProvider === 'openai') {
      review = await openaiReview(config, prompt);
    } else if (config.aiProvider === 'anthropic') {
      review = await anthropicReview(config, prompt);
    }
  } catch (error) {
    review = `AI review failed: ${error.message}`;
  }

  const reviewPath = path.join(config.outputDir, 'ai-review.md');
  await fs.writeFile(reviewPath, `# AI Review\n\n${review}\n`);
  return { review, reviewPath };
}

