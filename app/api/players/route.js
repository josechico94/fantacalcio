import { apiGet } from '@/lib/api-football'
export async function GET() {
  const season = process.env.DEFAULT_SEASON || '2025'
  const league = process.env.LEAGUE_ID || '135'
  const pages = [1,2], list = []
  for (const p of pages) {
    const j = await apiGet('/players', { league, season, page: p })
    const resp = j.response || []
    for (const item of resp) {
      const player = item.player || {}
      const stats = (item.statistics || [])[0] || {}
      const team = (stats.team || {}).name || ''
      const pos = (player.position || (stats.games||{}).position || 'MID').slice(0,3).toUpperCase()
      list.push({ id: String(player.id), name: player.name, position: pos, team })
    }
  }
  const seen = new Set(), unique = []
  for (const x of list) { if (seen.has(x.id)) continue; seen.add(x.id); unique.push(x) }
  return Response.json({ players: unique })
}