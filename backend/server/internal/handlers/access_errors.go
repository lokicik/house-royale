package handlers

import "github.com/gin-gonic/gin"

const (
	errCodeUnauthorized       = "unauthorized"
	errCodeInvalidPayload     = "invalid_payload"
	errCodeBadRequest         = "bad_request"
	errCodeAuthUnavailable    = "auth_service_unavailable"
	errCodeInvalidToken       = "invalid_token"
	errCodeIDTokenRequired    = "id_token_required"
	errCodeLobbyNotFound    = "lobby_not_found"
	errCodeRemovedFromLobby = "removed_from_lobby"
	errCodeGameInProgress   = "game_in_progress"
)

type errorResponse struct {
	Error     string `json:"error"`
	ErrorCode string `json:"error_code"`
}

func writeError(c *gin.Context, status int, code, message string) {
	c.JSON(status, errorResponse{
		Error:     message,
		ErrorCode: code,
	})
}

func writeAccessError(c *gin.Context, status int, code, message string) {
	writeError(c, status, code, message)
}
