import test from 'node:test';
import assert from 'node:assert/strict';
import { runPythonGate } from './python-gate.mjs';

test('Python gate uses an explicit executable path as one argument and runs the original gate unchanged', () => {
  const calls = [], env = { OMNIBUS_PYTHON: 'C:/Portable tools/Python/python.exe' };
  const result = runPythonGate('validate.py', ['final'], { cwd: '/sealed-source', env,
    execute: (...args) => { calls.push(args); return calls.length === 1 ? '[3,12,8]' : 'gate result'; } });
  assert.equal(result, 'gate result');
  assert.equal(calls.length, 2);
  for (const [command, , options] of calls) {
    assert.equal(command, env.OMNIBUS_PYTHON); assert.equal(options.cwd, '/sealed-source');
    assert.equal(options.env, env); assert.notEqual(options.shell, true); assert.equal(options.windowsHide, true);
  }
  assert.deepEqual(calls[1][1], ['-I', '-B', '-X', 'utf8', 'validate.py', 'final']);
  assert.equal(calls[1][2].stdio, 'inherit');
});

test('an ordinary Python installation needs no personal path or bundled Codex runtime', () => {
  const commands = [];
  runPythonGate('validate.py', ['final'], { env: {}, execute: command => { commands.push(command); return '[3,14,0]'; } });
  assert.deepEqual(commands, ['python3', 'python3']);
});

test('a missing, malformed or old interpreter never runs or bypasses the source gate', () => {
  for (const version of ['bad json', '[2,7,18]', '[3,9,9]', '[3,12]', '[3,"12",0]', '{}']) {
    let calls = 0;
    assert.throws(() => runPythonGate('validate.py', ['final'], { env: {}, execute: () => { calls++; return version; } }), /Python/);
    assert.equal(calls, 1);
  }
  let calls = 0;
  assert.throws(() => runPythonGate('validate.py', ['final'], { env: { OMNIBUS_PYTHON: '' }, execute: () => { calls++; } }), /OMNIBUS_PYTHON/);
  assert.equal(calls, 0);
  const missing = Object.assign(new Error('not installed'), { code: 'ENOENT' });
  assert.throws(() => runPythonGate('validate.py', ['final'], { env: {}, execute: () => { throw missing; } }), error => error.cause === missing);
});

test('a failing original source gate fails the build without retrying another interpreter', () => {
  let calls = 0; const rejected = Object.assign(new Error('source gate rejected'), { status: 1 });
  assert.throws(() => runPythonGate('validate.py', ['final'], { env: {}, execute: () => {
    if (++calls === 1) return '[3,12,8]'; throw rejected;
  } }), error => error === rejected);
  assert.equal(calls, 2);
});
