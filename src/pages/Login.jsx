import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-8">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🔑</div>
        <h1 className="text-xl font-bold">Organizer Login</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to manage tournaments</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-grass-500"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-grass-500"
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-grass-600 hover:bg-grass-700 text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
