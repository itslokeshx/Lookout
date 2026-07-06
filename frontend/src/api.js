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

export async function findUsers(prompt) {
  return request('POST', '/find-users', { prompt });
}

export async function approveDispatch(dispatchId) {
  return request('POST', '/approve-dispatch', { dispatch_id: dispatchId });
}

export async function getDispatchHistory() {
  return request('GET', '/dispatch-history');
}

/*
  Poll-based progress for dispatches.
  Calls onProgress with partial results until complete.
*/
export async function pollDispatchProgress(dispatchId, onProgress) {
  const poll = async () => {
    const data = await request('GET', `/dispatch-progress/${dispatchId}`);
    onProgress(data);
    if (data.status === 'complete' || data.status === 'failed') return data;
    await new Promise((r) => setTimeout(r, 1000));
    return poll();
  };
  return poll();
}
