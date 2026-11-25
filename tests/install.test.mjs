import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('only an explicit update refreshes the mods and leaves the installed layout and state alone', t => {
  const home = mkdtempSync(join(tmpdir(), 'herdr-spaces-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const install = (...args) => spawnSync('bash', ['install.sh', ...args], {
    encoding: 'utf8', env: { ...process.env, HERDR_APP_HOME: home },
  });
  let result = install();
  assert.equal(result.status, 0, result.error ?? result.stderr);
  const canonical = readFileSync('mods/grouped-spaces/groups.js', 'utf8');
  assert.equal(readFileSync('mods/space-group-picker/groups.js', 'utf8'), canonical);
  assert.equal(readFileSync(join(home, 'mods', 'space-group-picker', 'groups.js'), 'utf8'), canonical);
  for (const icon of ['collapse-all.svg', 'expand-all.svg']) {
    assert.match(readFileSync(join(home, 'mods', 'grouped-spaces', icon), 'utf8'), /^<svg /);
  }
  const picker = join(home, 'mods', 'space-group-picker', 'main.js');
  const layout = join(home, 'layouts', 'grouped-spaces.json');
  const state = join(home, 'shared.json');
  writeFileSync(picker, '// old version');
  writeFileSync(layout, '{"custom":true}');
  writeFileSync(state, '{"spaces-grouping.v1":{}}');
  assert.equal(install().status, 1);
  assert.equal(readFileSync(picker, 'utf8'), '// old version');
  result = install('--update');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(picker, 'utf8'), readFileSync('mods/space-group-picker/main.js', 'utf8'));
  assert.equal(readFileSync(layout, 'utf8'), '{"custom":true}');
  assert.equal(readFileSync(state, 'utf8'), '{"spaces-grouping.v1":{}}');
});
