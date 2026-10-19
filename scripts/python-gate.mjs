import { execFileSync } from 'node:child_process';

/** Run an existing source gate unchanged; an unavailable interpreter is a failure. */
export function runPythonGate(script, args, { cwd, env = process.env, execute = execFileSync } = {}) {
  const command = env.OMNIBUS_PYTHON === undefined ? 'python3' : env.OMNIBUS_PYTHON;
  if (typeof command !== 'string' || !command.trim())
    throw new Error('OMNIBUS_PYTHON must name a Python executable, without command-line arguments.');
  let version;
  try {
    version = JSON.parse(execute(command, ['-I', '-c', 'import json,sys; print(json.dumps(list(sys.version_info[:3])))'],
      { cwd, env, encoding: 'utf8', timeout: 10_000, maxBuffer: 4096, windowsHide: true }));
  } catch (cause) {
    throw new Error('Python is unavailable. Install Python 3.10 or newer and set OMNIBUS_PYTHON to its executable path.', { cause });
  }
  if (!Array.isArray(version) || version.length !== 3 || !version.every(Number.isInteger) || version[0] !== 3 || version[1] < 10)
    throw new Error('The original source gate requires Python 3.10 or newer. Check OMNIBUS_PYTHON.');
  // No shell, fallback gate, altered source files or replacement review decisions.
  return execute(command, ['-I', '-B', '-X', 'utf8', script, ...args],
    { cwd, env, stdio: 'inherit', windowsHide: true });
}
