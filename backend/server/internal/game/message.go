package game

import "encoding/json"

type MessageType string

const (
	MsgJoin            MessageType = "JOIN"
	MsgReady           MessageType = "READY"
	MsgSubmitGuess     MessageType = "SUBMIT_GUESS"
	MsgUpdateSettings  MessageType = "UPDATE_SETTINGS"
	MsgNextRoundVote   MessageType = "NEXT_ROUND_VOTE"
	MsgLeave           MessageType = "LEAVE"
	MsgRoundStart      MessageType = "ROUND_START"
	MsgRoundResult     MessageType = "ROUND_RESULT"
	MsgLeaderboard     MessageType = "LEADERBOARD"
	MsgPlayerJoined    MessageType = "PLAYER_JOINED"
	MsgPlayerLeft      MessageType = "PLAYER_LEFT"
	MsgError           MessageType = "ERROR"
	MsgLobbyState      MessageType = "LOBBY_STATE"
	MsgSettingsUpdated MessageType = "SETTINGS_UPDATED"
	MsgLobbyActivity   MessageType = "LOBBY_ACTIVITY"
	MsgRoundVoteState  MessageType = "ROUND_VOTE_STATE"
)

type Message struct {
	Type    MessageType     `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type JoinPayload struct {
	Nickname string `json:"nickname"`
}

type GuessPayload struct {
	PriceTRY float64 `json:"price_try"`
}

type ErrorPayload struct {
	Message string `json:"message"`
}

// UpdateSettingsPayload is sent by the host to change waiting-room settings.
// Zero values for round_count/round_duration_sec mean "no change"; ai_models
// is merged entry by entry into the lobby's map.
type UpdateSettingsPayload struct {
	RoundCount       int             `json:"round_count"`
	RoundDurationSec int             `json:"round_duration_sec"`
	AIModels         map[string]bool `json:"ai_models"`
}

// SettingsUpdatedPayload mirrors the current state of lobby settings + AI map.
type SettingsUpdatedPayload struct {
	Settings LobbySettings   `json:"settings"`
	AIModels map[string]bool `json:"ai_models"`
}

// LobbyStatePayload is sent to a single client on connect/join to hydrate the
// full waiting-room state.
type LobbyStatePayload struct {
	LobbyID            string          `json:"lobby_id"`
	HostID             string          `json:"host_id"`
	Status             Status          `json:"status"`
	Players            []Player        `json:"players"`
	Settings           LobbySettings   `json:"settings"`
	AIModels           map[string]bool `json:"ai_models"`
	AvailableAIModels  []AIModelMeta   `json:"available_ai_models"`
	YouID              string          `json:"you_id"`
}

// LobbyActivityPayload is broadcast to all clients so the activity feed stays
// in sync.
type LobbyActivityPayload struct {
	Kind           string `json:"kind"`
	ActorID        string `json:"actor_id,omitempty"`
	ActorNickname  string `json:"actor_nickname,omitempty"`
	UnixMillis     int64  `json:"ts"`
}

// RoundVoteStatePayload reports who has voted to advance and who is still
// needed; deadline is the unix-millis cutoff after which the server auto-advances.
type RoundVoteStatePayload struct {
	Round       int      `json:"round"`
	Voted       []string `json:"voted"`
	Needed      []string `json:"needed"`
	DeadlineTS  int64    `json:"deadline_ts"`
}
