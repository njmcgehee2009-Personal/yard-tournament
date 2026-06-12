import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_LABEL = { setup: 'Setting up', active: 'Live', completed: 'Finished' }
const STATUS_COLOR = {
  setup: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
}

export default function Home() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('tournaments')
      .select('*')
      .order('event_date', { ascending: false })
      .then(({ data }) => {
        setTournaments(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="text-5xl mb-2">🌿</div>
        <h1 className="text-2xl font-bold text-gray-800">McGehee Yard Tournament</h1>
        <p className="text-gray-500 text-sm mt-1">Backyard games. Serious competition.</p>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-4xl mb-3">🏠</p>
          <p>No tournaments yet. An organizer can create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => (
            <Link
              key={t.id}
              to={`/tournament/${t.id}`}
              className="block bg-white rounded-2xl border shadow-sm hover:shadow-md transition p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-800">{t.name}</div>
                  {t.event_date && (
                    <div className="text-sm text-gray-400 mt-0.5">
                      {new Date(t.event_date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </div>
                  )}
                  {t.location && (
                    <div className="text-xs text-gray-400">📍 {t.location}</div>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-grass-200 border-t-grass-600 rounded-full animate-spin" />
    </div>
  )
}
