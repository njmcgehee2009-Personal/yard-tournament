import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-4 border-grass-200 border-t-grass-600 rounded-full animate-spin" />
  )
}
