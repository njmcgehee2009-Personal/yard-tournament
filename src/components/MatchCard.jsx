// MatchCard — shows a single match; optional onScore callback for admin score entry

export default function MatchCard({ match, teams, onScore, compact = false }) {
  const t1 = teams[match.team1_id]
  const t2 = teams[match.team2_id]

  if (match.status === 'bye') return null

  const done = match.status === 'completed'
  const pending = !done && t1 && t2

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
        onScore && pending ? 'cursor-pointer hover:shadow-md transition' : ''
      }`}
      onClick={onScore && pending ? () => onScore(match) : undefined}
    >
      <div className={`flex items-stretch ${compact ? 'text-sm' : ''}`}>
        <TeamRow
          team={t1}
          score={match.score1}
          isWinner={done && match.winner_id === match.team1_id}
          isLoser={done && match.winner_id !== match.team1_id}
          side="left"
          compact={compact}
        />
        <div className="flex flex-col items-center justify-center px-2 bg-gray-50 text-xs text-gray-400 border-x">
          {done ? 'Final' : pending ? 'vs' : 'TBD'}
        </div>
        <TeamRow
          team={t2}
          score={match.score2}
          isWinner={done && match.winner_id === match.team2_id}
          isLoser={done && match.winner_id !== match.team2_id}
          side="right"
          compact={compact}
        />
      </div>
      {onScore && pending && (
        <div className="bg-grass-50 text-grass-700 text-xs text-center py-1 font-medium">
          Tap to enter score
        </div>
      )}
    </div>
  )
}

function TeamRow({ team, score, isWinner, isLoser, side, compact }) {
  return (
    <div
      className={`flex-1 flex items-center gap-2 px-3 py-3 ${
        isWinner ? 'bg-grass-50' : ''
      } ${side === 'right' ? 'flex-row-reverse' : ''}`}
    >
      {team && (
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: team.color ?? '#9ca3af' }}
        />
      )}
      <span className={`flex-1 font-medium truncate ${isLoser ? 'text-gray-400' : ''} ${!team ? 'text-gray-300' : ''}`}>
        {team?.name ?? 'TBD'}
      </span>
      {score != null && (
        <span className={`font-bold text-lg tabular-nums ${isWinner ? 'text-grass-700' : 'text-gray-500'}`}>
          {score}
        </span>
      )}
      {isWinner && <span className="text-grass-600 text-xs">✓</span>}
    </div>
  )
}
