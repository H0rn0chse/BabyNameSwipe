export const MAX_FILE_SIZE = 8 * 1024 * 1024;

export function parseNames(text) {
  let rows;
  try { rows = JSON.parse(text); }
  catch { throw new Error('This file is not valid JSON. Try the example file below.'); }
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('Upload a JSON array containing at least one name.');
  }
  const seen = new Set();
  const names = [];
  let duplicates = 0;
  rows.forEach((row, index) => {
    const fail = message => { throw new Error(`Name ${index + 1}: ${message}`); };
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail('expected an object.');
    if (typeof row.name !== 'string' || !row.name.trim()) fail('name must be a nonempty string.');
    if (row.meaning !== undefined && typeof row.meaning !== 'string') fail('meaning must be a string.');
    let origin = row.origin === undefined ? [] : row.origin;
    if (typeof origin === 'string') origin = [origin];
    if (!Array.isArray(origin) || origin.some(value => typeof value !== 'string')) {
      fail('origin must be a string or an array of strings.');
    }
    origin = [...new Set(origin.map(value => value.trim()).filter(Boolean))];
    const name = row.name.trim();
    const key = JSON.stringify([name.toLowerCase(), origin.map(value => value.toLowerCase()).sort()]);
    if (seen.has(key)) { duplicates++; return; }
    seen.add(key);
    names.push({ id: names.length + 1, name, meaning: (row.meaning || '').trim(), origin });
  });
  return { names, duplicates };
}

function shuffle(items) {
  const shuffled = [...items];
  // Fisher–Yates preserves every item exactly once without mutating the source.
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function createSession(names) {
  return { round: 1, queue: shuffle(names.map(name => name.id)), cursor: 0, liked: [], reviewed: 0, notice: '' };
}

export function decide(session, decision) {
  if (!['like', 'pass'].includes(decision) || session.cursor >= session.queue.length) {
    throw new Error('There is no name available to review.');
  }
  const id = session.queue[session.cursor];
  const liked = new Set(session.liked);
  if (decision === 'like') liked.add(id);
  else liked.delete(id);
  const next = { ...session, liked: [...liked], cursor: session.cursor + 1,
    reviewed: session.reviewed + (session.round === 1 ? 1 : 0) };
  if (next.cursor === next.queue.length) {
    next.notice = session.round === 1
      ? 'All names reviewed! You’re now revisiting your liked names.'
      : `Round ${session.round} complete. Keep exploring your liked names.`;
    if (!next.liked.length) next.notice = 'All names in this round reviewed. No liked names remain.';
    next.queue = shuffle(next.liked);
    next.cursor = 0;
    next.round++;
  }
  return next;
}

export function makeExport(names, session, history, lastName) {
  const latest = new Map(history.map(entry => [entry.nameId, entry]));
  const liked = new Set(session.liked);
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    lastName,
    progress: { round: session.round, reviewed: session.reviewed, total: names.length,
      roundReviewed: session.cursor, roundTotal: session.queue.length },
    likedNames: names.filter(name => liked.has(name.id)),
    names: names.map(name => ({ ...name, decision: latest.get(name.id)?.decision || 'unreviewed',
      decidedAt: latest.get(name.id)?.timestamp || null })),
    history,
  };
}