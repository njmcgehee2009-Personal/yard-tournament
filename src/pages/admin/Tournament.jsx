import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  generateRoundRobinMatches,
  generateSingleElimMatches,
  generateDoubleElimMatches,
  findNextMatches,
} from '../../lib/brackets'
import BracketView from '../../components/BracketView'
import StandingsTable from '../../components/StandingsTable'

const YARD_GAMES = ['Cornhole', 'Bocce Ball', 'Kan Jam', 'Spikeball', 'Ladder Toss', 'Horseshoes', 'Bags', 'Croquet']
const FORMATS = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'single_elim', label: 'Single Elimination' },
  { value: 'double_elim', label: 'Double Elimination' },
]
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1']

export default function AdminTournament() {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])
  const [matchesByGame, setMatchesByGame] = useState({})
  const [activeGame, setActiveGame] = useState(null)
  const [activeTab, setActiveTab] = useState('matches')
  const [scoreModal, setScoreModal] = useState(null) // match being scored
  const [loading, setLoading] = useState(true)

  // Form states
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamColor, setNewTeamColor] = useState(COLORS[0])
  const [newGame, setNewGame] = useState({ name: YARD_GAMES[0], format: 'round_robin' })
  const [gameTeamSel, setGameTeamSel] = useState({})

  useEffect(() => { loadAll() }, [id])

  const loadAll = async () => {
    const [{ data: t }, { data: tm }, { data: g }] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('teams').select('*').eq('tournament_id', id).order('created_at'),
      supabase.from('games').select('*').eq('tournament_id', id).order('created_at'),
    ])
    setTournament(t)
    setTeams(tm ?? [])
    const gameList = g ?? []
    setGames(gameList)
    if (!activeGame && gameList.length) setActiveGame(gameList[0].id)
    await loadMatchesForGames(gameList)
    setLoading(false)
  }

  const loadMatchesForGames = async (gameList) => {
    if (!gameList.length) return
    const { data: allMatches } = await supabase
      .from('matches').select('*').in('game_id', gameList.map(g => g.id))
    const byGame = {}
    for (const g of gameList) byGame[g.id] = []
    for (const m of allMatches ?? []) {
      if (byGame[m.game_id]) byGame[m.game_id].push(m)
    }
    setMatchesByGame(byGame)
  }

  // ─── Teams ───────────────────────────────────────────────────────────────

  const addTeam = async (e) => {
    e.preventDefault()
    if (!newTeamName.trim()) return
    await supabase.from('teams').insert({
      tournament_id: id, name: newTeamName.trim(), color: newTeamColor,
    })
    setNewTeamName('')
    setNewTeamColor(COLORS[teams.length % COLORS.length])
    loadAll()
  }

  const deleteTeam = async (teamId) => {
    if (!confirm('Remove this team?')) return
    await supabase.from('teams').delete().eq('id', teamId)
    loadAll()
  }

  // ─── Games ───────────────────────────────────────────────────────────────

  const addGame = async (e) => {
    e.preventDefault()
    await supabase.from('games').insert({ ...newGame, tournament_id: id, status: 'setup' })
    loadAll()
  }

  const deleteGame = async (gameId) => {
    if (!confirm('Delete this game and all its matches?')) return
    await supabase.from('games').delete().eq('id', gameId)
    loadAll()
  }

  // ─── Bracket generation ──────────────────────────────────────────────────

  const startGame = async (game) => {
    const gameTeams = teams.filter(t => gameTeamSel[game.id]?.includes(t.id))
    if (gameTeams.length < 2) {
      alert('Select at least 2 teams for this game.')
      return
    }

    let matchTemplates
    if (game.format === 'round_robin') {
      matchTemplates = generateRoundRobinMatches(gameTeams)
    } else if (game.format === 'single_elim') {
      matchTemplates = generateSingleElimMatches(gameTeams)
    } else {
      matchTemplates = generateDoubleElimMatches(gameTeams)
    }

    // Insert all match slots
    const { data: inserted } = await supabase.from('matches').insert(
      matchTemplates.map(m => ({ ...m, game_id: game.id }))
    ).select()

    // Update game status
    await supabase.from('games').update({ status: 'active' }).eq('id', game.id)

    // Auto-advance byes
    if (inserted) {
      for (const m of inserted.filter(m => m.status === 'bye')) {
        await advanceWinner(m, inserted)
      }
    }

    loadAll()
  }

  // ─── Score entry ─────────────────────────────────────────────────────────

  const submitScore = async ({ match, score1, score2 }) => {
    const winnerId = score1 > score2 ? match.team1_id : match.team2_id
    const { data: updated } = await supabase.from('matches')
      .update({ score1, score2, winner_id: winnerId, status: 'completed' })
      .eq('id', match.id)
      .select()
      .single()

    if (updated) {
      const allMatches = matchesByGame[match.game_id] ?? []
      // Replace the updated match in local state for findNextMatches
      const freshList = allMatches.map(m => m.id === updated.id ? updated : m)
      await advanceWinner(updated, freshList)
    }

    setScoreModal(null)
    loadAll()
  }

  const advanceWinner = async (match, allMatches) => {
    const { winMatch, winSlot, lossMatch, lossSlot } = findNextMatches(match, allMatches)

    if (winMatch && match.winner_id) {
      await supabase.from('matches')
        .update({ [winSlot]: match.winner_id })
        .eq('id', winMatch.id)
    }

    // Double elim: advance loser to losers bracket
    if (lossMatch && lossSlot) {
      const loserId = match.winner_id === match.team1_id ? match.team2_id : match.team1_id
      if (loserId) {
        await supabase.from('matches')
          .update({ [lossSlot]: loserId })
          .eq('id', lossMatch.id)
      }
    }

    // Check if game is complete (no pending matches with teams assigned)
    const remainingMatches = await supabase.from('matches')
      .select('*').eq('game_id', match.game_id).in('status', ['pending'])
      .not('team1_id', 'is', null).not('team2_id', 'is', null)
    if (!remainingMatches.data?.length) {
      await supabase.from('games').update({ status: 'completed' }).eq('id', match.game_id)
    }
  }

  if (loading) return <Spinner />
  if (!tournament) return <p className="text-center text-gray-400 py-12">Not found.</p>

  const teamsMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const currentGame = games.find(g => g.id === activeGame)
  const currentMatches = (matchesByGame[activeGame] ?? []).filter(m => m.status !== 'bye')

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <Link to="/admin" className="text-sm text-grass-600 font-medium">← Dashboard</Link>
        <h1 className="text-xl font-bold mt-1">{tournament.name}</h1>
      </div>

      {/* Section tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
        {['teams', 'games', 'matches'].map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition capitalize ${
              activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── TEAMS tab ───────────────────────────────────────────────────── */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <form onSubmit={addTeam} className="bg-white border rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Add Team</h2>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="input w-full" placeholder="Team name" required
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {COLORS.slice(0, 6).map(c => (
                  <button key={c} type="button"
                    onClick={() => setNewTeamColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border-2 transition ${newTeamColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  />
                ))}
              </div>
              <button type="submit" className="btn-primary flex-shrink-0">Add</button>
            </div>
          </form>

          {teams.length === 0 ? (
            <p className="text-center text-gray-400 py-6">No teams yet.</p>
          ) : (
            <div className="space-y-2">
              {teams.map(t => (
                <div key={t.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="font-medium flex-1">{t.name}</span>
                  <button onClick={() => deleteTeam(t.id)} className="text-red-400 text-sm hover:text-red-600 transition">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GAMES tab ───────────────────────────────────────────────────── */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          <form onSubmit={addGame} className="bg-white border rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Add Game</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Yard Game</label>
                <select value={newGame.name}
                  onChange={e => setNewGame({ ...newGame, name: e.target.value })}
                  className="input w-full">
                  {YARD_GAMES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Format</label>
                <select value={newGame.format}
                  onChange={e => setNewGame({ ...newGame, format: e.target.value })}
                  className="input w-full">
                  {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full">Add Game</button>
            </div>
          </form>

          {games.length === 0 ? (
            <p className="text-center text-gray-400 py-6">No games yet.</p>
          ) : (
            <div className="space-y-3">
              {games.map(g => (
                <div key={g.id} className="bg-white border rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="text-xs text-gray-400">{FORMAT_LABEL[g.format]}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      g.status === 'active' ? 'bg-green-100 text-green-700' :
                      g.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{STATUS_LABEL[g.status]}</span>
                  </div>

                  {g.status === 'setup' && (
                    <>
                      <p className="text-sm text-gray-500 mb-2">Select teams:</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {teams.map(t => {
                          const selected = gameTeamSel[g.id]?.includes(t.id)
                          return (
                            <button key={t.id} type="button"
                              onClick={() => {
                                const cur = gameTeamSel[g.id] ?? []
                                setGameTeamSel({
                                  ...gameTeamSel,
                                  [g.id]: selected ? cur.filter(x => x !== t.id) : [...cur, t.id]
                                })
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border transition ${
                                selected ? 'border-grass-500 bg-grass-50 text-grass-700 font-medium' : 'border-gray-200 text-gray-600'
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startGame(g)}
                          disabled={!gameTeamSel[g.id]?.length || gameTeamSel[g.id].length < 2}
                          className="btn-primary text-sm disabled:opacity-40"
                        >
                          Generate bracket ({gameTeamSel[g.id]?.length ?? 0} teams)
                        </button>
                        <button onClick={() => deleteGame(g.id)}
                          className="text-sm text-red-400 hover:text-red-600 transition px-2">
                          Delete
                        </button>
                      </div>
                    </>
                  )}

                  {g.status !== 'setup' && (
                    <button onClick={() => deleteGame(g.id)}
                      className="text-sm text-red-400 hover:text-red-600 transition">
                      Reset game
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MATCHES tab ─────────────────────────────────────────────────── */}
      {activeTab === 'matches' && (
        <div>
          {/* Game selector */}
          {games.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
              {games.map(g => (
                <button key={g.id} onClick={() => setActiveGame(g.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                    activeGame === g.id
                      ? 'bg-grass-600 text-white shadow'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {currentGame ? (
            currentMatches.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                Start this game in the Games tab to generate matches.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  Tap a pending match to enter the score.
                </p>
                <BracketView
                  matches={currentMatches}
                  teams={teamsMap}
                  format={currentGame.format}
                  onScore={setScoreModal}
                />
              </>
            )
          ) : (
            <p className="text-center text-gray-400 py-8">Add games first.</p>
          )}
        </div>
      )}

      {/* Score entry modal */}
      {scoreModal && (
        <ScoreModal
          match={scoreModal}
          teams={teamsMap}
          onSubmit={submitScore}
          onClose={() => setScoreModal(null)}
        />
      )}
    </div>
  )
}

// ─── Score Modal ──────────────────────────────────────────────────────────────

function ScoreModal({ match, teams, onSubmit, onClose }) {
  const [s1, setS1] = useState(match.score1 ?? '')
  const [s2, setS2] = useState(match.score2 ?? '')
  const t1 = teams[match.team1_id]
  const t2 = teams[match.team2_id]

  const handleSubmit = (e) => {
    e.preventDefault()
    const score1 = parseInt(s1, 10)
    const score2 = parseInt(s2, 10)
    if (isNaN(score1) || isNaN(score2)) return
    if (score1 === score2) { alert('Scores must be different (no ties).'); return }
    onSubmit({ match, score1, score2 })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5">
        <h2 className="font-bold text-lg mb-4 text-center">Enter Score</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t1?.color }} />
                <span className="font-medium text-sm">{t1?.name}</span>
              </div>
              <input type="number" min="0" value={s1} onChange={e => setS1(e.target.value)}
                className="input text-center text-2xl font-bold w-full" required />
            </div>
            <div className="text-gray-400 font-bold">vs</div>
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t2?.color }} />
                <span className="font-medium text-sm">{t2?.name}</span>
              </div>
              <input type="number" min="0" value={s2} onChange={e => setS2(e.target.value)}
                className="input text-center text-2xl font-bold w-full" required />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full text-base py-3">Save Score</button>
          <button type="button" onClick={onClose}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition">
            Cancel
          </button>
        </form>
      </div>
    </div>
  )
}

const FORMAT_LABEL = {
  round_robin: 'Round Robin', single_elim: 'Single Elimination', double_elim: 'Double Elimination',
}
const STATUS_LABEL = { setup: 'Setup', active: 'Active', completed: 'Complete' }

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-grass-200 border-t-grass-600 rounded-full animate-spin" />
    </div>
  )
}
