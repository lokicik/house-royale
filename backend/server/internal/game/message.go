package game

import "encoding/json"

type MessageType string

const (
	MsgJoin         MessageType = "JOIN"
	MsgReady        MessageType = "READY"
	MsgSubmitGuess  MessageType = "SUBMIT_GUESS"
	MsgRoundStart   MessageType = "ROUND_START"
	MsgRoundResult  MessageType = "ROUND_RESULT"
	MsgLeaderboard  MessageType = "LEADERBOARD"
	MsgPlayerJoined MessageType = "PLAYER_JOINED"
	MsgPlayerLeft   MessageType = "PLAYER_LEFT"
	MsgError        MessageType = "ERROR"
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
