const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

/**
 * Creates a lobby. Passes both Authorization (prod) and X-Player-ID (dev)
 * so the backend auth middleware works in both environments.
 */
export async function createLobby(user, idToken, nickname) {
  const res = await fetch(`${BASE}/lobbies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
    body: JSON.stringify({ nickname }),
  })
  if (!res.ok) throw new Error('Lobi oluşturulamadı')
  return res.json()
}

export async function getLobby(lobbyId) {
  const res = await fetch(`${BASE}/lobbies/${lobbyId}`)
  if (!res.ok) throw new Error('Lobi bulunamadı')
  return res.json()
}

export async function getLeaderboard() {
  const res = await fetch(`${BASE}/leaderboard`)
  if (!res.ok) throw new Error('Liderlik tablosu yüklenemedi')
  return res.json()
}

export async function getMyLobbies(user, idToken) {
  const res = await fetch(`${BASE}/lobbies`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) throw new Error('Odalar yüklenemedi')
  return res.json()
}

export async function getMyHistory(user, idToken) {
  const res = await fetch(`${BASE}/history`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) throw new Error('Geçmiş yüklenemedi')
  return res.json()
}

/**
 * Builds the WebSocket URL for a lobby connection.
 * Passes the Firebase ID token as ?token= so both dev (JWT decode)
 * and prod (VerifyIDToken) backends can authenticate the connection.
 * Note: https:// → wss:// conversion is handled by the replace.
 */
export function wsUrl(lobbyId, idToken) {
  const wsBase = BASE.replace(/^http/, 'ws')
  return `${wsBase}/ws/lobby/${lobbyId}?token=${encodeURIComponent(idToken)}`
}
