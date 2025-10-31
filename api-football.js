const BASE = 'https://v3.football.api-sports.io';
export async function apiGet(path, params = {}) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('Missing API_FOOTBALL_KEY');
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`;
  const r = await fetch(url, { headers: { 'x-apisports-key': key } });
  if (!r.ok) { const text = await r.text(); throw new Error(`API error ${r.status}: ${text}`); }
  return r.json();
}