import { apiGet } from '@/lib/api-football'
function projRow(base, team, opponent) {
  const minutesFactor = Math.max(Math.min((base.minutes_expected ?? 75) / 90, 1.2), 0)
  const l_goals = Math.max(base.xg_per90 ?? 0.1, 0) * minutesFactor
  const l_ast = Math.max(base.xa_per90 ?? 0.1, 0) * minutesFactor
  const p_cs = (base.position === 'GK' || base.position === 'DEF') ? 0.25 : 0.0
  const goalPts = { GK:4, DEF:4, MID:3, FWD:3 }[base.position] ?? 3
  const assistPts = 1
  const csPts = { GK:1, DEF:1, MID:0, FWD:0 }[base.position] ?? 0
  const exp = (base.p_start ?? 0.8) * (goalPts*l_goals + assistPts*l_ast + (csPts * p_cs) + 0.5*minutesFactor)
  return { player_id: base.player_id, name: base.name, position: base.position, match_id: base.match_id, team, opponent,
           p_start: +((base.p_start ?? 0.8).toFixed(3)), exp_goals: +(l_goals.toFixed(3)), exp_assists: +(l_ast.toFixed(3)), p_cs: +(p_cs.toFixed(3)), exp_points: +(exp.toFixed(3)) }
}
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const season = process.env.DEFAULT_SEASON || '2025'
  const league = process.env.LEAGUE_ID || '135'
  const md = Number(searchParams.get('matchday') || '1')
  const role = (searchParams.get('role') || '').toUpperCase()
  const fx = await apiGet('/fixtures', { league, season })
  const fixtures = (fx.response || []).filter(f => {
    const round = (f.league || {}).round || ''
    const n = Number(String(round).split('-').pop().trim()) || 1
    return n === md
  })
  const teamIds = new Set()
  for (const f of fixtures) { const t=f.teams||{}; if (t.home?.id) teamIds.add(String(t.home.id)); if (t.away?.id) teamIds.add(String(t.away.id)) }
  const teamById = {}
  for (const f of fixtures) { teamById[String(f.teams.home.id)] = f.teams.home.name; teamById[String(f.teams.away.id)] = f.teams.away.name }
  const p1 = await apiGet('/players', { league, season, page: 1 })
  const p2 = await apiGet('/players', { league, season, page: 2 })
  const candidates = [...(p1.response||[]), ...(p2.response||[])]
  const rows = []
  for (const c of candidates) {
    const player = c.player || {}; const stats = (c.statistics || [])[0] || {}
    const tid = String((stats.team||{}).id || ''); if (!teamIds.has(tid)) continue
    const match = fixtures.find(f => String(f.teams.home.id) === tid || String(f.teams.away.id) === tid); if (!match) continue
    const team = teamById[tid] || ''
    const oppId = String(String(match.teams.home.id) === tid ? match.teams.away.id : match.teams.home.id)
    const opponent = teamById[oppId] || ''
    const pos = (player.position || (stats.games||{}).position || 'MID').slice(0,3).toUpperCase(); if (role && pos !== role) continue
    const base = { player_id: String(player.id), name: player.name, position: pos, match_id: String(match.fixture.id),
                   xg_per90: pos !== 'GK' ? 0.22 : 0, xa_per90: (pos === 'MID' || pos === 'DEF') ? 0.17 : 0.08,
                   minutes_expected: pos !== 'FWD' ? 78 : 72, p_start: pos !== 'FWD' ? 0.84 : 0.70 }
    rows.push(projRow(base, team, opponent)); if (rows.length > 120) break
  }
  rows.sort((a,b)=> b.exp_points - a.exp_points)
  return Response.json({ season, matchday: md, count: rows.length, projections: rows })
}