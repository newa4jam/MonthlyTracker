(function (root) {
  'use strict';
  const DB_NAME = 'SaveTrackLocalDB';
  const STORE = 'records';
  const STATE_KEY = 'app-state';

  const defaultState = () => ({
    version: 1,
    transactions: [],
    fixedExpenses: [],
    plans: {},
    settings: { displayName: 'Saver', currency: 'JPY', monthlyGoal: 100000 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const open = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const get = async () => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result || defaultState());
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  };

  const set = async (state) => {
    const db = await open();
    const payload = Object.assign(defaultState(), state, { updatedAt: new Date().toISOString() });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(payload, STATE_KEY);
      tx.oncomplete = () => { db.close(); resolve(payload); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  };

  const clear = async () => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(STATE_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  };

  root.SaveTrackDB = { get, set, clear, defaultState };
})(window);
