// Tiny API client — talks to the EduFast backend via same-origin /api
// (Vite dev server proxies /api -> http://localhost:5000)
const BASE = import.meta.env.VITE_API_URL || ''

export function getToken() { return localStorage.getItem('edufast_token') || '' }
export function setToken(t) { t ? localStorage.setItem('edufast_token', t) : localStorage.removeItem('edufast_token') }

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try { data = await res.json() } catch { /* empty body */ }
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)
  return data
}
