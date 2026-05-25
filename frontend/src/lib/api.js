const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

async function readError(res, fallback) {
  try {
    const data = await res.json()
    return data?.error || fallback
  } catch {
    return fallback
  }
}

async function readErrorDetails(res, fallback) {
  try {
    const data = await res.json()
    return {
      message: data?.error || fallback,
      errorCode: data?.error_code || null,
    }
  } catch {
    return {
      message: fallback,
      errorCode: null,
    }
  }
}

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
  if (!res.ok) throw new Error(await readError(res, 'Lobi olusturulamadi'))
  return res.json()
}

export async function getLobby(user, idToken, lobbyId) {
  const res = await fetch(`${BASE}/lobbies/${lobbyId}`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) throw new Error(await readError(res, 'Lobi bulunamadi'))
  return res.json()
}

export async function probeLobbyAccess(user, idToken, lobbyId) {
  const res = await fetch(`${BASE}/lobbies/${lobbyId}`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })

  if (res.ok) {
    return { ok: true, status: res.status, errorCode: null, message: null }
  }

  const details = await readErrorDetails(res, 'Lobiye su anda ulasilamiyor')
  return {
    ok: false,
    status: res.status,
    errorCode: details.errorCode,
    message: details.message,
  }
}

export async function getLeaderboard() {
  const res = await fetch(`${BASE}/leaderboard`)
  if (!res.ok) throw new Error(await readError(res, 'Liderlik tablosu yuklenemedi'))
  return res.json()
}

export async function getMyLobbies(user, idToken) {
  const res = await fetch(`${BASE}/lobbies`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) throw new Error(await readError(res, 'Odalar yuklenemedi'))
  return res.json()
}

export async function getMyHistory(user, idToken) {
  const res = await fetch(`${BASE}/history`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) throw new Error(await readError(res, 'Gecmis yuklenemedi'))
  return res.json()
}

export async function getMyLeague(user, idToken) {
  const res = await fetch(`${BASE}/me/league`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) throw new Error(await readError(res, 'Lig bilgisi yuklenemedi'))
  return res.json()
}

/**
 * Builds the WebSocket URL for a lobby connection.
 * Passes the Firebase ID token as ?token= so both dev (JWT decode)
 * and prod (VerifyIDToken) backends can authenticate the connection.
 */
export function wsUrl(lobbyId, idToken) {
  const wsBase = BASE.replace(/^http/, 'ws')
  return `${wsBase}/ws/lobby/${lobbyId}?token=${encodeURIComponent(idToken)}`
}
