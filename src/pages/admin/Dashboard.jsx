import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const YARD_GAMES = ['Cornhole', 'Bocce Ball', 'Kan Jam', 'Spikeball', 'Ladder Toss', 'Horseshoes', 'Bags', 'Croquet']

export default function AdminDashboard() {
  const [tournaments, setTournaments] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', event_date: '', location: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = () =>
    supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setTournaments(data ?? []))

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('tournaments').insert({ ...form, status: 'setup' })
    setSaving(false)
    setShowNew(false)
    setForm({ name: '', event_date: '', location: '' })
    load()
  }

  const updateStatus = async (id, status) => {
    await supabase.from('tournaments').update({ status }).eq('id', id)
    load()
  }

  const deleteTournament = async (id) => {
    if (!confirm('Delete this tournament and all its data?')) return
    await supabase.from('tournaments').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => setShowNew(true)}
          className="bg-grass-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-grass-700 transition"
        >
          + New Tournament
        </button>
      </div>

      {/* New tournament form */}
      {showNew && (
        <div className="bg-white border rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold mb-4">Create Tournament</h2>
          <form onSubmit={create} className="space-y-3">
            <Field label="Name" required>
              <input
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="input" placeholder="Summer Backyard Bash" required
              />
            </Field>
            <Field label="Date">
              <input type="date" value={form.event_date}
                onChange={e => setForm({ ...form, event_date: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Location">
              <input value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="input" placeholder="Backyard, 123 Main St"
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="bg-grass-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-grass-700 transition disabled:opacity-50">
                {saving ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowNew(false)}
                className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tournament list */}
      {tournaments.length === 0 && !showNew ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-3xl mb-2">🏆</p>
          <p>No tournaments yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => (
            <div key={t.id} className="bg-white border rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  {t.event_date && (
                    <div className="text-sm text-gray-400">
                      {new Date(t.event_date + 'T12:00:00').toLocaleDateString()}
                    </div>
                  )}
                  {t.location && <div className="text-xs text-gray-400">📍 {t.location}</div>}
                </div>
                <select
                  value={t.status}
                  onChange={e => updateStatus(t.id, e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1 bg-white"
                >
                  <option value="setup">Setting up</option>
                  <option value="active">Live</option>
                  <option value="completed">Finished</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <Link
                  to={`/admin/tournament/${t.id}`}
                  className="text-sm bg-grass-50 text-grass-700 font-medium px-3 py-1.5 rounded-lg hover:bg-grass-100 transition"
                >
                  Manage →
                </Link>
                <Link
                  to={`/tournament/${t.id}`}
                  className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  Public view
                </Link>
                <button
                  onClick={() => deleteTournament(t.id)}
                  className="text-sm text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 transition ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}
