import { apiGet } from '@/lib/api-football'
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const a = searchParams.get('a'); const b = searchParams.get('b')
  const season = process.env.DEFAULT_SEASON || '2025'
  if (!a || !b) return new Response('Missing a or b', { status: 400 })
  async function one(id) {
    const j = await apiGet('/players', { id, season })
    const r = (j.response || [])[0] || {}
    const player = r.player || {}; const st = r.statistics || []
    let games=0, goals=0, assists=0, shots=0, minutes=0, team='', pos=''
    for (const s of st) {
      const g = s.games || {}; const sh = s.shots || {}; const gl = s.goals || {}
      games += Number(g.appearences || g.appearances || 0)
      minutes += Number(g.minutes || 0)
      shots += Number(sh.total || 0)
      goals += Number(gl.total || 0)
      assists += Number(gl.assists || 0)
      team = (s.team||{}).name || team
      pos = (player.position || g.position || 'MID').slice(0,3).toUpperCase()
    }
    return { id, name: player.name, team, position: pos, season_games: games, goals, assists, shots, minutes }
  }
  const A = await one(a); const B = await one(b)
  return Response.json({ a: A, b: B })
}