import { MAX_FILE_SIZE, parseNames, createSession, decide, makeExport } from './model.js';
import { openStorage, loadData, saveState, saveLastName, readExportData } from './storage.js';

const $ = id => document.getElementById(id);
let db;
let names = [];
let byId = new Map();
let session = createSession([]);
let revision = 0;
let lastName = '';
let busy = true;
let view = 'discover';
let page = 0;
let drag = null;
const PAGE_SIZE = 20;

function feedback(message, error = false) {
  $('feedback').textContent = message;
  $('feedback').classList.toggle('error', error);
  $('feedback').hidden = !message;
}

function setBusy(value) {
  busy = value;
  document.querySelectorAll('[data-download], [data-restart]').forEach(button => {
    button.disabled = busy || !db || !names.length;
  });
  $('pass').disabled = $('like').disabled = busy || !db || !session.queue.length;
  $('name-file').disabled = busy || !db;
  $('last-name-form').querySelector('button').disabled = busy || !db;
  $('dismiss-notice').disabled = busy || !db;
}

function showView(next) {
  view = ['discover', 'shortlist', 'settings'].includes(next) ? next : 'discover';
  document.querySelectorAll('.view').forEach(section => { section.hidden = section.id !== view; });
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (view === 'shortlist') renderShortlist();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function originChips(record) {
  const fragment = document.createDocumentFragment();
  (record.origin.length ? record.origin : ['Origin not provided']).forEach(origin => {
    const chip = document.createElement('span');
    chip.className = 'origin-chip';
    chip.textContent = origin;
    fragment.append(chip);
  });
  return fragment;
}

function resetDrag() {
  drag = null;
  $('name-card').classList.remove('dragging');
  $('name-card').style.transform = '';
  $('swipe-stamp').style.opacity = '0';
}

function render() {
  $('loading').hidden = true;
  $('welcome').hidden = !!names.length;
  $('no-names').hidden = !names.length || !!session.queue.length;
  $('swipe-area').hidden = !session.queue.length;
  $('collection-stats').hidden = !names.length;
  $('round-notice').hidden = !session.notice;
  $('round-notice-text').textContent = session.notice;
  $('nav-count').textContent = session.liked.length;
  $('liked-count').textContent = session.liked.length;
  $('reviewed-count').textContent = `${session.reviewed} / ${names.length}`;
  $('last-name').value = lastName;
  $('round-label').textContent = session.round === 1 ? 'Round 1 · First impressions' : `Round ${session.round} · A little closer`;
  $('position-label').textContent = `${session.cursor + 1} of ${session.queue.length}`;
  $('round-progress').max = Math.max(1, session.queue.length);
  $('round-progress').value = session.cursor;
  const record = byId.get(session.queue[session.cursor]);
  if (record) {
    $('first-name').textContent = record.name;
    $('card-last-name').textContent = lastName;
    $('card-category').textContent = session.round === 1 ? 'A NAME TO GET TO KNOW' : 'ONE OF YOUR LITTLE FAVORITES';
    $('origins').replaceChildren(originChips(record));
    $('meaning').textContent = record.meaning || 'A little mystery — no meaning provided.';
    $('meaning').scrollTop = 0;
    $('name-card').setAttribute('aria-label', `Baby name: ${record.name}${lastName ? ` ${lastName}` : ''}`);
  }
  resetDrag();
  if (view === 'shortlist') renderShortlist();
  setBusy(busy);
}

function renderShortlist() {
  const ids = session.liked;
  const pages = Math.max(1, Math.ceil(ids.length / PAGE_SIZE));
  page = Math.max(0, Math.min(page, pages - 1));
  $('shortlist-count').textContent = ids.length;
  $('shortlist-empty').hidden = !!ids.length;
  const fragment = document.createDocumentFragment();
  ids.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach(id => {
    const record = byId.get(id);
    const li = document.createElement('li');
    const heading = document.createElement('h3');
    heading.append(document.createTextNode(record.name));
    if (lastName) {
      const surname = document.createElement('span');
      surname.textContent = ` ${lastName}`;
      heading.append(surname);
    }
    const origins = document.createElement('div');
    origins.append(originChips(record));
    const meaning = document.createElement('p');
    meaning.textContent = record.meaning || 'Meaning not provided.';
    li.append(heading, origins, meaning);
    fragment.append(li);
  });
  $('shortlist-items').replaceChildren(fragment);
  $('pagination').hidden = pages <= 1;
  $('page-label').textContent = `${page + 1} / ${pages}`;
  $('previous-page').disabled = page === 0;
  $('next-page').disabled = page === pages - 1;
}

async function refresh() {
  const data = await loadData(db);
  names = data.names;
  byId = new Map(names.map(name => [name.id, name]));
  session = data.session || createSession(names);
  revision = data.revision;
  lastName = data.lastName;
}

async function operation(action) {
  if (busy || !db) return;
  setBusy(true);
  try { await action(); }
  catch (error) {
    feedback(error.message || 'Something went wrong. Please try again.', true);
    // Re-read committed state: never display a decision that failed to persist.
    try { await refresh(); } catch { /* Preserve the visible error if storage remains unavailable. */ }
  } finally {
    setBusy(false);
    render();
  }
}

function confirmAction(title, message, label) {
  const dialog = $('confirmation');
  $('confirmation-title').textContent = title;
  $('confirmation-message').textContent = message;
  $('confirm-action').textContent = label;
  dialog.returnValue = 'cancel';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
  });
}

function handleSwipeResult(decision) {
  if (busy || view !== 'discover' || !session.queue.length) return;
  operation(async () => {
    const record = byId.get(session.queue[session.cursor]);
    const next = decide(session, decision);
    revision = await saveState(db, revision, next, { entry: {
      nameId: record.id, decision, round: session.round, timestamp: new Date().toISOString(),
    } });
    const completed = next.round !== session.round;
    session = next;
    feedback(completed ? session.notice : `${record.name} ${decision === 'like' ? 'added to your favorites' : 'passed'}.`);
  });
}

async function uploadNames(event) {
  const file = event.target.files[0];
  if (!file) return;
  await operation(async () => {
    if (file.size > MAX_FILE_SIZE) throw new Error('Choose a JSON file no larger than 8 MB.');
    const imported = parseNames(await file.text());
    if (names.length && !await confirmAction('Make room for new names?',
      'This replaces your current names and clears their likes and review history. Download your results first if you want to keep them. Your last name stays.', 'Replace names')) return;
    const next = createSession(imported.names);
    revision = await saveState(db, revision, next, { names: imported.names, clearHistory: true });
    names = imported.names;
    byId = new Map(names.map(name => [name.id, name]));
    session = next;
    page = 0;
    const message = `${names.length.toLocaleString()} names imported${imported.duplicates ? `; ${imported.duplicates} duplicates skipped` : ''}. Ready for a little inspiration?`;
    $('import-summary').textContent = message;
    feedback(message);
    showView('discover');
  });
  event.target.value = '';
}

function restart() {
  operation(async () => {
    if (!names.length) return;
    if (!await confirmAction('See them with fresh eyes?',
      'This clears your likes and review history and starts again with all uploaded names. Your last name stays.', 'Restart all names')) return;
    const next = createSession(names);
    revision = await saveState(db, revision, next, { clearHistory: true });
    session = next;
    page = 0;
    feedback('A fresh beginning. All your names are ready to review again.');
    showView('discover');
  });
}

function downloadResults() {
  operation(async () => {
    const data = await readExportData(db);
    if (!data.names.length) throw new Error('Upload some names before downloading results.');
    const result = makeExport(data.names, data.session, data.history, data.lastName);
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `little-name-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback('Your results download is ready. Keep it somewhere safe.');
  });
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); showView('discover'); });
document.querySelectorAll('[data-open-settings]').forEach(button => button.addEventListener('click', () => showView('settings')));
document.querySelectorAll('[data-restart]').forEach(button => button.addEventListener('click', restart));
document.querySelectorAll('[data-download]').forEach(button => button.addEventListener('click', downloadResults));
$('name-file').addEventListener('change', uploadNames);
$('pass').addEventListener('click', () => handleSwipeResult('pass'));
$('like').addEventListener('click', () => handleSwipeResult('like'));
$('previous-page').addEventListener('click', () => { page--; renderShortlist(); });
$('next-page').addEventListener('click', () => { page++; renderShortlist(); });
$('last-name-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('last-name').value.trim();
  operation(async () => {
    await saveLastName(db, value);
    lastName = value;
    feedback(value ? 'Your family name is saved. Try it on in Discover.' : 'Last name cleared.');
  });
});
$('dismiss-notice').addEventListener('click', () => operation(async () => {
  const next = { ...session, notice: '' };
  revision = await saveState(db, revision, next);
  session = next;
  feedback('');
}));

document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      event.target.closest('input, textarea, select, button, [contenteditable="true"], dialog') ||
      $('confirmation').open || view !== 'discover' || busy) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    handleSwipeResult(event.key === 'ArrowRight' ? 'like' : 'pass');
  }
});

const card = $('name-card');
card.addEventListener('pointerdown', event => {
  if (busy || !event.isPrimary || event.button !== 0) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, horizontal: false };
  card.setPointerCapture(event.pointerId);
});
card.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.horizontal && Math.abs(dy) > Math.max(12, Math.abs(dx))) { resetDrag(); return; }
  if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) drag.horizontal = true;
  if (!drag.horizontal) return;
  drag.dx = dx;
  card.classList.add('dragging');
  card.style.transform = `translateX(${Math.max(-130, Math.min(130, dx))}px) rotate(${Math.max(-9, Math.min(9, dx / 18))}deg)`;
  $('swipe-stamp').textContent = dx > 0 ? 'LOVE' : 'PASS';
  $('swipe-stamp').classList.toggle('passing', dx < 0);
  $('swipe-stamp').style.opacity = Math.min(1, Math.abs(dx) / 90);
});
card.addEventListener('pointerup', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const { dx, horizontal } = drag;
  resetDrag();
  if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId);
  if (horizontal && Math.abs(dx) >= 75) handleSwipeResult(dx > 0 ? 'like' : 'pass');
});
card.addEventListener('pointercancel', resetDrag);
card.addEventListener('lostpointercapture', resetDrag);

setBusy(true);
try {
  db = await openStorage();
  await refresh();
  setBusy(false);
  render();
} catch (error) {
  $('loading').hidden = true;
  feedback(`Could not open saved names. ${error.message} Please allow browser storage and reload.`, true);
  setBusy(true);
}