import MatchCard from './MatchCard'

export default function BracketView({ matches, teams, format, onScore }) {
  if (format === 'round_robin') {
    return <RoundRobinView matches={matches} teams={teams} onScore={onScore} />
  }

  const brackets =
    format === 'double_elim'
      ? ['winners', 'losers', 'grand_final']
      : ['winners']

  return (
    <div className="space-y-8">
      {brackets.map(bracket => {
        const bMatches = matches.filter(m => m.bracket === bracket)
        if (!bMatches.length) return null
        const rounds = [...new Set(bMatches.map(m => m.round))].sort((a, b) => a - b)
        return (
          <div key={bracket}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {bracketLabel(bracket, format)}
            </h3>
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-4 pb-2" style={{ minWidth: `${rounds.length * 200}px` }}>
                {rounds.map(r => {
                  const roundMatches = bMatches.filter(m => m.round === r)
                  return (
                    <div key={r} className="flex-1 min-w-[180px] space-y-2">
                      <div className="text-center text-xs text-gray-400 font-medium mb-2">
                        {roundLabel(r, rounds.length, bracket)}
                      </div>
                      <div className="flex flex-col justify-around gap-2" style={{ minHeight: `${roundMatches.length * 80}px` }}>
                        {roundMatches.map(m => (
                          <MatchCard key={m.id} match={m} teams={teams} onScore={onScore} compact />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RoundRobinView({ matches, teams, onScore }) {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  return (
    <div className="space-y-6">
      {rounds.map(r => (
        <div key={r}>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Round {r}</h3>
          <div className="space-y-2">
            {matches.filter(m => m.round === r).map(m => (
              <MatchCard key={m.id} match={m} teams={teams} onScore={onScore} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function bracketLabel(bracket, format) {
  if (format !== 'double_elim') return 'Bracket'
  if (bracket === 'winners') return 'Winners Bracket'
  if (bracket === 'losers') return 'Losers Bracket'
  return 'Grand Final'
}

function roundLabel(round, totalRounds, bracket) {
  if (bracket === 'grand_final') return 'Grand Final'
  if (bracket === 'winners') {
    if (round === totalRounds) return 'Final'
    if (round === totalRounds - 1) return 'Semifinals'
    return `Round ${round}`
  }
  return `Round ${round}`
}
