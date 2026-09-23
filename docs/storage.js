const DATABASE = 'baby-name-swipe';

export function openStorage() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB is unavailable in this browser.')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('names', { keyPath: 'id' });
      db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('metadata');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other tabs of this app and reload to open storage.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

export function loadData(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['names', 'metadata'], 'readonly');
    const names = tx.objectStore('names').getAll();
    const session = tx.objectStore('metadata').get('session');
    const lastName = tx.objectStore('metadata').get('lastName');
    const revision = tx.objectStore('metadata').get('revision');
    tx.oncomplete = () => resolve({ names: names.result, session: session.result,
      lastName: lastName.result || '', revision: revision.result || 0 });
    tx.onabort = () => reject(tx.error || new Error('Could not read browser storage.'));
  });
}

// Checking the revision inside the write transaction prevents two tabs overwriting progress.
export function saveState(db, expectedRevision, session, { names, entry, clearHistory = false } = {}) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['names', 'history', 'metadata'], 'readwrite');
    const metadata = tx.objectStore('metadata');
    let conflict = false;
    const request = metadata.get('revision');
    request.onsuccess = () => {
      if ((request.result || 0) !== expectedRevision) { conflict = true; tx.abort(); return; }
      if (names) {
        const store = tx.objectStore('names');
        store.clear();
        names.forEach(name => store.put(name));
      }
      if (clearHistory) tx.objectStore('history').clear();
      if (entry) tx.objectStore('history').add(entry);
      metadata.put(session, 'session');
      metadata.put(expectedRevision + 1, 'revision');
    };
    tx.oncomplete = () => resolve(expectedRevision + 1);
    tx.onabort = () => reject(new Error(conflict
      ? 'Progress changed in another tab. Latest progress has been reloaded; please try again.'
      : `Could not save your progress. ${tx.error?.message || 'Browser storage may be full or unavailable.'}`));
  });
}

export function saveLastName(db, lastName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('metadata', 'readwrite');
    tx.objectStore('metadata').put(lastName, 'lastName');
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || new Error('Could not save your last name.'));
  });
}

export function readExportData(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['names', 'history', 'metadata'], 'readonly');
    const names = tx.objectStore('names').getAll();
    const history = tx.objectStore('history').getAll();
    const session = tx.objectStore('metadata').get('session');
    const lastName = tx.objectStore('metadata').get('lastName');
    tx.oncomplete = () => resolve({ names: names.result, history: history.result,
      session: session.result, lastName: lastName.result || '' });
    tx.onabort = () => reject(tx.error || new Error('Could not read results.'));
  });
}