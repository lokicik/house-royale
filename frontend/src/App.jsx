import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import RoundResult from './pages/RoundResult'
import Leaderboard from './pages/Leaderboard'
import ModelComparison from './pages/ModelComparison'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
          <Route path="/game/:id" element={<ProtectedRoute><Game /></ProtectedRoute>} />
          <Route path="/round-result" element={<ProtectedRoute><RoundResult /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/model-comparison" element={<ProtectedRoute><ModelComparison /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
