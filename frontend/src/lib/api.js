const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

function buildApiError(details, fallbackCode, fallbackMessage) {
  const error = new Error(details.message || fallbackMessage)
  error.code = details.errorCode || fallbackCode || 'generic'
  return error
}

async function readError(res, fallbackCode, fallbackMessage) {
  try {
    const data = await res.json()
    return {
      message: data?.error || fallbackMessage,
      errorCode: data?.error_code || fallbackCode,
    }
  } catch {
    return {
      message: fallbackMessage,
      errorCode: fallbackCode,
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
  if (!res.ok) {
    throw buildApiError(
      await readError(res, 'lobby_create_failed', 'Could not create the room.'),
      'lobby_create_failed',
      'Could not create the room.',
    )
  }
  return res.json()
}

export async function getLobby(user, idToken, lobbyId) {
  const res = await fetch(`${BASE}/lobbies/${lobbyId}`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) {
    throw buildApiError(
      await readError(res, 'lobby_access_failed', 'Room could not be opened.'),
      'lobby_access_failed',
      'Room could not be opened.',
    )
  }
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

  const details = await readError(res, 'lobby_access_failed', 'The room is not reachable right now.')
  return {
    ok: false,
    status: res.status,
    errorCode: details.errorCode,
    message: details.message,
  }
}

export async function getLeaderboard() {
  const res = await fetch(`${BASE}/leaderboard`)
  if (!res.ok) {
    throw buildApiError(
      await readError(res, 'leaderboard_load_failed', 'Could not load the leaderboard.'),
      'leaderboard_load_failed',
      'Could not load the leaderboard.',
    )
  }
  return res.json()
}

export async function getMyLobbies(user, idToken) {
  const res = await fetch(`${BASE}/lobbies`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) {
    throw buildApiError(
      await readError(res, 'lobbies_load_failed', 'Could not load rooms.'),
      'lobbies_load_failed',
      'Could not load rooms.',
    )
  }
  return res.json()
}

export async function getMyHistory(user, idToken) {
  const res = await fetch(`${BASE}/history`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) {
    throw buildApiError(
      await readError(res, 'history_load_failed', 'Could not load match history.'),
      'history_load_failed',
      'Could not load match history.',
    )
  }
  return res.json()
}

export async function getMyLeague(user, idToken) {
  const res = await fetch(`${BASE}/me/league`, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'X-Player-ID': user.uid,
    },
  })
  if (!res.ok) {
    throw buildApiError(
      await readError(res, 'league_load_failed', 'Could not load league information.'),
      'league_load_failed',
      'Could not load league information.',
    )
  }
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
