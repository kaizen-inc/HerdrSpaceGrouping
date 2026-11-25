import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assign, toggle, sections, displayRows, listGroups, renameGroup, setAllFolded } from '../mods/grouped-spaces/groups.js';

const api = { w: { id: 'api', machine: null } };
const scratch = { w: { id: 'scratch', machine: null } };
const fresh = { w: { id: 'new', machine: null } };
const remote = { w: { id: 'api', machine: 'remote' } };

test('only explicitly assigned spaces join a group, including after reload', () => {
  const state = JSON.parse(JSON.stringify(assign(undefined, api.w, ' Client ')));
  assert.deepEqual(sections(state, null, [api, scratch, fresh]), {
    groups: [{ name: 'Client', folded: false, rows: [api] }],
    ungrouped: [scratch, fresh],
  });
});

test('moving and ungrouping leave no empty headers and preserve row order', () => {
  let state = assign(undefined, api.w, 'Old');
  state = assign(state, scratch.w, 'New');
  state = assign(state, api.w, 'New');
  assert.deepEqual(sections(state, null, [api, scratch]).groups, [
    { name: 'New', folded: false, rows: [api, scratch] },
  ]);
  state = assign(assign(state, api.w, null), scratch.w, null);
  assert.deepEqual(sections(state, null, [api, scratch]), { groups: [], ungrouped: [api, scratch] });
});

test('a remote machine folds independently and recovers membership after reconnecting', () => {
  let state = assign(assign(undefined, api.w, 'Client'), remote.w, 'Client');
  state = toggle(state, 'remote', 'Client');
  assert.deepEqual(sections(state, 'remote', []).groups, []);
  assert.equal(sections(state, null, [api]).groups[0].folded, false);
  assert.deepEqual(sections(state, 'remote', [remote]).groups, [{ name: 'Client', folded: true, rows: [remote] }]);
});

test('invalid state, blank names and reserved object keys do not hide spaces', () => {
  assert.deepEqual(sections({ '[null]': { members: { api: [] }, folded: 7 } }, null, [api]), { groups: [], ungrouped: [api] });
  const state = assign(undefined, api.w, '__proto__');
  assert.equal(assign(state, api.w, '  '), state);
  assert.equal(sections(toggle(state, null, '__proto__'), null, [api]).groups[0].folded, true);
});

test('legacy groups stay listed and keep their fold after the last member leaves', () => {
  const legacy = { '[null]': { members: { api: 'Client' }, folded: ['Client'] }, '["remote"]': { members: { api: 'Client' } } };
  assert.deepEqual(listGroups(legacy), [{ machine: null, names: ['Client'] }, { machine: 'remote', names: ['Client'] }]);
  const empty = assign(legacy, api.w, null);
  assert.deepEqual(listGroups(empty), listGroups(legacy));
  assert.deepEqual(sections(empty, null, [api]).groups, []);
  assert.equal(sections(assign(empty, api.w, 'Client'), null, [api]).groups[0].folded, true);
  const renamed = renameGroup(empty, null, 'Client', 'Studio');
  assert.deepEqual(listGroups(renamed.state)[0], { machine: null, names: ['Studio'] });
});

test('rename preserves members and fold without changing an identically named remote group', () => {
  const legacy = { '[null]': { members: { api: 'Client', scratch: 'Other' }, folded: ['Client'] }, '["remote"]': { members: { api: 'Client' } } };
  const result = renameGroup(legacy, null, 'Client', ' Studio ');
  const saved = JSON.parse(JSON.stringify(result.state));
  assert.deepEqual(sections(saved, null, [api]).groups, [{ name: 'Studio', folded: true, rows: [api] }]);
  assert.deepEqual(sections(saved, 'remote', [remote]).groups, [{ name: 'Client', folded: false, rows: [remote] }]);
  for (const name of ['Other', ' ']) {
    const invalid = renameGroup(legacy, null, 'Client', name);
    assert.ok(invalid.error);
    assert.equal(invalid.state, legacy);
  }
  assert.ok(renameGroup(legacy, null, 'Missing', 'New').error);
});

test('collapse and expand all preserve membership across machines and include empty groups', () => {
  const local = { names: ['Client', 'Empty'], members: { api: 'Client' }, folded: [] };
  const state = { '[null]': local, '["remote"]': { members: { api: 'Remote' } } };
  const collapsed = setAllFolded(state, true);
  assert.equal(sections(collapsed, null, [api, scratch]).groups[0].folded, true);
  assert.deepEqual(sections(collapsed, null, [api, scratch]).ungrouped, [scratch]);
  assert.equal(sections(collapsed, 'remote', [remote]).groups[0].folded, true);
  assert.equal(sections(assign(collapsed, scratch.w, 'Empty'), null, [scratch]).groups[0].folded, true);
  const expanded = setAllFolded(JSON.parse(JSON.stringify(collapsed)), false);
  assert.equal(sections(expanded, null, [api]).groups[0].folded, false);
  assert.equal(sections(expanded, 'remote', [remote]).groups[0].folded, false);
  assert.equal(sections(assign(expanded, scratch.w, 'Empty'), null, [scratch]).groups[0].folded, false);
  assert.deepEqual(listGroups(expanded), listGroups(state));
  assert.deepEqual(local.folded, []);
});

test('a collapsed active child points scrolling at its group header', () => {
  const active = { ...api, w: { ...api.w, active: true } };
  const state = toggle(assign(undefined, api.w, 'Client'), null, 'Client');
  assert.deepEqual(displayRows(state, null, [scratch, active]), [
    { group: 'Client', folded: true, active: true }, { label: 'Ungrouped' }, { row: scratch },
  ]);
  assert.deepEqual(displayRows(state, null, [scratch, active], true), [{ row: scratch }, { row: active }]);
});
