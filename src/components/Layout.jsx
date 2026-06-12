import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-grass-700 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="text-2xl">🏆</span>
            <span className="hidden sm:inline">Yard Tournament</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <Link
                  to="/admin"
                  className={`px-3 py-1 rounded-full font-medium transition ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-white text-grass-700'
                      : 'hover:bg-grass-600'
                  }`}
                >
                  Admin
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1 rounded-full hover:bg-grass-600 transition"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1 rounded-full hover:bg-grass-600 transition"
              >
                Organizer login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="text-center text-xs text-gray-400 py-4">
        McGehee Yard Tournament
      </footer>
    </div>
  )
}
