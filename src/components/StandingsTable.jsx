import { computeRoundRobinStandings, computeElimStandings } from '../lib/brackets'

export default function StandingsTable({ game, teams, matches }) {
  if (!teams.length) return <p className="text-gray-400 text-sm">No teams yet.</p>

  const isRR = game.format === 'round_robin'
  const rows = isRR
    ? computeRoundRobinStandings(teams, matches)
    : computeElimStandings(teams, matches)

  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-3 w-6">#</th>
            <th className="text-left px-4 py-3">Team</th>
            {isRR ? (
              <>
                <th className="px-3 py-3 text-center">W</th>
                <th className="px-3 py-3 text-center">L</th>
                <th className="px-3 py-3 text-center">Pts</th>
                <th className="px-3 py-3 text-center">+/-</th>
              </>
            ) : (
              <th className="px-4 py-3 text-left">Reached</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, idx) => (
            <tr key={row.team.id} className={idx === 0 ? 'bg-amber-50' : ''}>
              <td className="px-4 py-3 text-gray-400 font-medium">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: row.team.color ?? '#9ca3af' }}
                  />
                  <span className="font-medium">{row.team.name}</span>
                  {idx === 0 && <span className="text-amber-500 text-xs">👑</span>}
                </div>
              </td>
              {isRR ? (
                <>
                  <td className="px-3 py-3 text-center font-semibold text-grass-700">{row.w}</td>
                  <td className="px-3 py-3 text-center text-gray-500">{row.l}</td>
                  <td className="px-3 py-3 text-center font-bold">{row.pts}</td>
                  <td className="px-3 py-3 text-center text-gray-500">
                    {row.pf - row.pa >= 0 ? '+' : ''}{row.pf - row.pa}
                  </td>
                </>
              ) : (
                <td className="px-4 py-3 text-gray-600">
                  {row.bracket === 'none' ? '—' : `${bracketLabel(row.bracket)} R${row.round}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function bracketLabel(b) {
  if (b === 'winners') return 'WB'
  if (b === 'losers') return 'LB'
  if (b === 'grand_final') return 'GF'
  return ''
}
