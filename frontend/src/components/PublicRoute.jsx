import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContextValue'

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/lobby" replace />
  return children
}
