package handlers

import "github.com/gin-gonic/gin"

const (
	errCodeLobbyNotFound    = "lobby_not_found"
	errCodeRemovedFromLobby = "removed_from_lobby"
	errCodeGameInProgress   = "game_in_progress"
)

type accessErrorResponse struct {
	Error     string `json:"error"`
	ErrorCode string `json:"error_code"`
}

func writeAccessError(c *gin.Context, status int, code, message string) {
	c.JSON(status, accessErrorResponse{
		Error:     message,
		ErrorCode: code,
	})
}
