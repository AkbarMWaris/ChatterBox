const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function handleResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
  }
  return json;
}

export async function fetchMessages(room = 'group') {
  const res = await fetch(`${API_URL}/messages?room=${encodeURIComponent(room)}`);
  return handleResponse(res);
}

export async function sendMessage(payload) {
  const res = await fetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: form
  });
  return handleResponse(res);
}
