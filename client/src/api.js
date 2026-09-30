export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: form ? undefined : body ? { 'Content-Type': 'application/json' } : undefined,
    body: form ? form : body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Erro ${res.status}`, data?.details);
  }
  return data;
}
