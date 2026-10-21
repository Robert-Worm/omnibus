import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

export const validCodeRevision = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

/** Build-time metadata only. Never guess a revision for modified or archived code. */
export function buildCodeRevision(root, explicit) {
  if (explicit !== undefined && explicit !== '') {
    if (!validCodeRevision(explicit)) throw Error('Invalid explicit code revision; use a full Git commit hash.');
    return explicit;
  }
  try {
    const git = args => execFileSync('git', args, {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000,
    }).trim();
    if (realpathSync(git(['rev-parse', '--show-toplevel'])) !== realpathSync(root)) return null;
    if (git(['status', '--porcelain', '--untracked-files=normal'])) return null;
    const revision = git(['rev-parse', 'HEAD']);
    return validCodeRevision(revision) ? revision : null;
  } catch {
    return null;
  }
}
