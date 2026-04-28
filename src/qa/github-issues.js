export async function createGithubIssues({ config, githubIssues }) {
  const result = {
    attempted: false,
    created: [],
    skipped: false,
    errors: [],
  };

  if (!config.createIssues) {
    result.skipped = true;
    result.errors.push('CREATE_GITHUB_ISSUES is false. Issue creation skipped.');
    return result;
  }

  result.attempted = true;

  if (!config.githubToken) {
    result.errors.push('GITHUB_TOKEN is missing. Issue creation skipped.');
    return result;
  }

  if (!config.githubRepo) {
    result.errors.push('GITHUB_REPO is missing. Issue creation skipped.');
    return result;
  }

  for (const issue of githubIssues) {
    const response = await fetch(`https://api.github.com/repos/${config.githubRepo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: issue.title,
        body: issue.body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      result.errors.push(`${issue.title}: ${response.status} ${response.statusText} ${errorText}`);
      continue;
    }

    const data = await response.json();
    result.created.push({
      title: issue.title,
      number: data.number,
      url: data.html_url,
    });
  }

  return result;
}

