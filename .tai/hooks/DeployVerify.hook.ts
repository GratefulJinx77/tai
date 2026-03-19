#!/usr/bin/env bun
/**
 * DeployVerify.hook.ts -- PostToolUse hook for Bash
 *
 * TRIGGER: PostToolUse (matcher: Bash)
 *
 * Detects `git push` and waits for GitHub Actions CI workflows to complete.
 * Reports pass/fail status back to the agent as additionalContext.
 *
 * Repo-agnostic: detects repo from git remote or cwd.
 *
 * Output schema: PostToolUse ({ hookSpecificOutput: { hookEventName, additionalContext } })
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  process.exit(0);
}

const toolInput = input.tool_input || {};
const toolOutput = input.tool_output || {};
const command: string = toolInput.command || '';

// Gate: Only trigger on git push
const isGitPush = /git\s+push/.test(command);
if (!isGitPush) process.exit(0);

// Detect repo from git remote
let repoSlug = '';
try {
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8', timeout: 5000 }).trim();
  const match = remoteUrl.match(/[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
  if (match) repoSlug = match[1];
} catch { /* no git remote */ }

if (!repoSlug) process.exit(0);

// Check if push actually succeeded
const output = `${toolOutput?.stdout || ''} ${toolOutput?.stderr || ''}`;
if (output.includes('rejected') || output.includes('error:') || output.includes('fatal:')) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: '[DeployVerify] git push FAILED -- no CI triggered. Investigate the push error before proceeding.',
    },
  }));
  process.exit(0);
}

// Wait for CI and report results
async function waitForCI(): Promise<string> {
  const maxWaitMs = 10 * 60 * 1000;
  const pollIntervalMs = 15_000;
  const startTime = Date.now();

  await new Promise(r => setTimeout(r, 5000));

  let runs: Array<{ id: number; name: string; status: string; conclusion: string | null }> = [];
  try {
    const runsJson = execSync(
      `gh run list --repo ${repoSlug} --event push --limit 4 --json databaseId,name,status,conclusion`,
      { encoding: 'utf-8', timeout: 15000 }
    );
    runs = JSON.parse(runsJson).map((r: any) => ({
      id: r.databaseId, name: r.name, status: r.status, conclusion: r.conclusion,
    }));
  } catch {
    return `[DeployVerify] WARNING: Could not fetch CI status (gh CLI error). Manually verify deployment.`;
  }

  if (runs.length === 0) {
    return `[DeployVerify] WARNING: No CI runs found. Manually verify deployment.`;
  }

  const activeRuns = runs.filter(r => r.status === 'in_progress' || r.status === 'queued');

  if (activeRuns.length === 0) {
    const results = runs.slice(0, 2).map(r => `${r.name}: ${r.conclusion?.toUpperCase() || 'UNKNOWN'}`);
    const allPassed = runs.slice(0, 2).every(r => r.conclusion === 'success');
    if (allPassed) {
      return `[DeployVerify] CI PASSED -- All workflows succeeded. ${results.join(', ')}. Deployment confirmed.`;
    } else {
      return `[DeployVerify] CI FAILED -- ${results.join(', ')}. DO NOT declare deployment successful. Investigate failures.`;
    }
  }

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    try {
      const updatedJson = execSync(
        `gh run list --repo ${repoSlug} --event push --limit 4 --json databaseId,name,status,conclusion`,
        { encoding: 'utf-8', timeout: 15000 }
      );
      const updated = JSON.parse(updatedJson);
      const stillActive = updated.filter((r: any) => r.status === 'in_progress' || r.status === 'queued');

      if (stillActive.length === 0) {
        const results = updated.slice(0, 2).map((r: any) => `${r.name}: ${(r.conclusion || 'UNKNOWN').toUpperCase()}`);
        const allPassed = updated.slice(0, 2).every((r: any) => r.conclusion === 'success');
        const elapsed = Math.round((Date.now() - startTime) / 1000);

        if (allPassed) {
          return `[DeployVerify] CI PASSED (${elapsed}s) -- All workflows succeeded. ${results.join(', ')}. Deployment confirmed.`;
        } else {
          return `[DeployVerify] CI FAILED (${elapsed}s) -- ${results.join(', ')}. DO NOT declare deployment successful.`;
        }
      }
    } catch { /* poll failure -- continue */ }
  }

  return `[DeployVerify] WARNING: CI still running after 10 minutes. Check manually.`;
}

waitForCI().then(result => {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: result },
  }));
}).catch(err => {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `[DeployVerify] WARNING: Hook error -- manually verify deployment. Error: ${err?.message || err}`,
    },
  }));
}).finally(() => {
  process.exit(0);
});
