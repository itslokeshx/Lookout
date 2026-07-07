const BASE = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export async function getSettings() {
  return request('GET', '/settings');
}

export async function saveSettings(settings) {
  return request('POST', '/settings', settings);
}

export async function getDatabases() {
  return request('GET', '/databases');
}

export async function getCollections(dbName) {
  return request('GET', `/collections/${encodeURIComponent(dbName)}`);
}

export async function getSample(dbName, collectionName) {
  return request('GET', `/sample/${encodeURIComponent(dbName)}/${encodeURIComponent(collectionName)}`);
}

export async function suggestMapping(dbName, primaryCollection, secondaryCollection) {
  return request('POST', '/suggest-mapping', {
    db_name: dbName,
    primary_collection: primaryCollection,
    secondary_collection: secondaryCollection || null,
  });
}

export async function checkJoin(dbName, primaryCollection, secondaryCollection, localKey, foreignKey) {
  return request('POST', '/check-join', {
    db_name: dbName,
    primary_collection: primaryCollection,
    secondary_collection: secondaryCollection,
    local_key: localKey,
    foreign_key: foreignKey,
  });
}

export async function findUsers(prompt) {
  return request('POST', '/find-users', { prompt });
}

export async function approveDispatch(dispatchId) {
  return request('POST', '/approve-dispatch', { dispatch_id: dispatchId });
}

export async function getDispatchHistory() {
  return request('GET', '/dispatch-history');
}

export async function sendChatMessage(message, history) {
  return request('POST', '/chat', { message, history });
}

export async function clearDispatchHistory() {
  return request('DELETE', '/dispatch-history');
}
