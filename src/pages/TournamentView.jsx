import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BracketView from '../components/BracketView'
import StandingsTable from '../components/StandingsTable'

const GAME_ICONS = {
  'Cornhole': '🌽', 'Bocce Ball': '🎱', 'Kan Jam': '🥏', 'Spikeball': '⚪',
  'Ladder Toss': '🪜', 'Horseshoes': '🧲', 'Bags': '🌽', 'Croquet': '🔨',
}

export default function TournamentView() {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [games, setGames] = useState([])
  const [teams, setTeams] = useState([])
  const [matchesByGame, setMatchesByGame] = useState({})
  const [activeGame, setActiveGame] = useState(null)
  const [activeTab, setActiveTab] = useState('bracket')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
    // Real-time updates
    const channel = supabase
      .channel(`tournament-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadMatches)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  const loadAll = async () => {
    const [{ data: t }, { data: g }, { data: tm }] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('games').select('*').eq('tournament_id', id).order('created_at'),
      supabase.from('teams').select('*').eq('tournament_id', id),
    ])
    setTournament(t)
    setTeams(tm ?? [])
    const gameList = g ?? []
    setGames(gameList)
    if (gameList.length) setActiveGame(gameList[0].id)
    await loadMatchesForGames(gameList)
    setLoading(false)
  }

  const loadMatches = () => loadMatchesForGames(games)

  const loadMatchesForGames = async (gameList) => {
    if (!gameList.length) return
    const { data: allMatches } = await supabase
      .from('matches')
      .select('*')
      .in('game_id', gameList.map(g => g.id))
    const byGame = {}
    for (const g of gameList) byGame[g.id] = []
    for (const m of allMatches ?? []) {
      if (byGame[m.game_id]) byGame[m.game_id].push(m)
    }
    setMatchesByGame(byGame)
  }

  if (loading) return <Spinner />
  if (!tournament) return <p className="text-center text-gray-400 py-12">Tournament not found.</p>

  const teamsMap = Object.fromEntries((teams).map(t => [t.id, t]))
  const currentGame = games.find(g => g.id === activeGame)
  const currentMatches = (matchesByGame[activeGame] ?? []).filter(m => m.status !== 'bye')

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <Link to="/" className="text-sm text-grass-600 font-medium">← All tournaments</Link>
        <h1 className="text-2xl font-bold mt-1">{tournament.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          {tournament.event_date && (
            <span>📅 {new Date(tournament.event_date + 'T12:00:00').toLocaleDateString()}</span>
          )}
          {tournament.location && <span>📍 {tournament.location}</span>}
        </div>
      </div>

      {games.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-4xl mb-2">🎮</p>
          <p>No games set up yet.</p>
        </div>
      ) : (
        <>
          {/* Game tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
            {games.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveGame(g.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeGame === g.id
                    ? 'bg-grass-600 text-white shadow'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{GAME_ICONS[g.name] ?? '🎯'}</span>
                {g.name}
              </button>
            ))}
          </div>

          {currentGame && (
            <>
              {/* Format badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                  {FORMAT_LABEL[currentGame.format]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  currentGame.status === 'active' ? 'bg-green-100 text-green-700' :
                  currentGame.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {STATUS_LABEL[currentGame.status]}
                </span>
              </div>

              {/* Bracket / Standings tabs */}
              <div className="flex rounded-lg bg-gray-100 p-1 mb-5">
                {['bracket', 'standings'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                      activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {tab === 'bracket' ? (currentGame.format === 'round_robin' ? 'Schedule' : 'Bracket') : 'Standings'}
                  </button>
                ))}
              </div>

              {activeTab === 'bracket' && (
                currentMatches.length === 0
                  ? <p className="text-center text-gray-400 py-8">No matches scheduled yet.</p>
                  : <BracketView matches={currentMatches} teams={teamsMap} format={currentGame.format} />
              )}

              {activeTab === 'standings' && (
                <StandingsTable
                  game={currentGame}
                  teams={teams.filter(t =>
                    currentMatches.some(m => m.team1_id === t.id || m.team2_id === t.id)
                  )}
                  matches={currentMatches}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

const FORMAT_LABEL = {
  round_robin: 'Round Robin',
  single_elim: 'Single Elimination',
  double_elim: 'Double Elimination',
}
const STATUS_LABEL = { setup: 'Not started', active: 'In progress', completed: 'Complete' }

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-grass-200 border-t-grass-600 rounded-full animate-spin" />
    </div>
  )
}
