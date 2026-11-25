export const storageKey = 'spaces-grouping.v1';

const key = machine => JSON.stringify([machine ?? null]);
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const bucket = (state, machine) => record(record(state)[key(machine)]);
const foldedNames = entry => Array.isArray(entry.folded) ? entry.folded : [];
const groupNames = entry => [...new Set([
  ...(Array.isArray(entry.names) ? entry.names : []), ...Object.values(record(entry.members)),
].filter(name => typeof name === 'string' && name.trim()))];

export function listGroups(state) {
  return Object.entries(record(state)).flatMap(([id, entry]) => {
    let machine;
    try { [machine] = JSON.parse(id); } catch { return []; }
    if ((machine !== null && typeof machine !== 'string') || key(machine) !== id) return [];
    const names = groupNames(record(entry));
    return names.length ? [{ machine, names }] : [];
  });
}

export function setAllFolded(state, folded) {
  return {
    ...record(state),
    ...Object.fromEntries(listGroups(state).map(({ machine, names }) =>
      [key(machine), { ...bucket(state, machine), folded: folded ? names : [] }])),
  };
}

export function renameGroup(state, machine, from, to) {
  const name = to.trim();
  const entry = bucket(state, machine);
  const names = groupNames(entry);
  if (!names.includes(from)) return { state, error: 'This group no longer exists.' };
  if (!name) return { state, error: 'Enter a group name.' };
  if (name === from) return { state };
  if (names.includes(name)) return { state, error: 'A group with this name already exists on this machine.' };
  const rename = value => value === from ? name : value;
  const members = Object.fromEntries(Object.entries(record(entry.members)).map(([id, group]) => [id, rename(group)]));
  return { state: { ...record(state), [key(machine)]: { names: names.map(rename), members, folded: foldedNames(entry).map(rename) } } };
}

export function assign(state, space, name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (name !== null && !trimmed) return state;
  const entry = bucket(state, space.machine);
  const members = { ...record(entry.members), [space.id]: trimmed };
  if (name === null) delete members[space.id];
  const names = groupNames({ names: groupNames(entry), members });
  return { ...record(state), [key(space.machine)]: { names, members, folded: foldedNames(entry) } };
}

export function toggle(state, machine, name) {
  const entry = bucket(state, machine);
  const names = foldedNames(entry);
  const folded = names.includes(name) ? names.filter(item => item !== name) : [...names, name];
  return { ...record(state), [key(machine)]: { ...entry, folded } };
}

export function sections(state, machine, rows) {
  const entry = bucket(state, machine);
  const members = record(entry.members);
  const groups = new Map(), ungrouped = [];
  for (const row of rows) {
    const name = Object.hasOwn(members, row.w.id) ? members[row.w.id] : null;
    if (typeof name !== 'string' || !name.trim()) { ungrouped.push(row); continue; }
    if (!groups.has(name)) groups.set(name, { name, folded: foldedNames(entry).includes(name), rows: [] });
    groups.get(name).rows.push(row);
  }
  return { groups: [...groups.values()], ungrouped };
}

export function displayRows(state, machine, rows, compact = false) {
  if (compact) return rows.map(row => ({ row }));
  const { groups, ungrouped } = sections(state, machine, rows);
  return [
    ...groups.flatMap(({ name, folded, rows }) => [
      { group: name, folded, active: folded && rows.some(row => row.w.active) },
      ...(folded ? [] : rows.map(row => ({ row: { ...row, tree: null, grouped: true } }))),
    ]),
    ...(groups.length && ungrouped.length ? [{ label: 'Ungrouped' }] : []),
    ...ungrouped.map(row => ({ row })),
  ];
}
