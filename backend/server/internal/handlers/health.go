package handlers

import (
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// FirestoreHealth verifies the server can talk to Firestore. Used to diagnose
// production deploys where writes silently disappear — a 503 here means the
// service account or FIREBASE_PROJECT_ID is wrong on the host.
func FirestoreHealth(client *firestore.Client, projectID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, err := client.Collection("_health").Doc("ping").Get(c.Request.Context())
		if err != nil && status.Code(err) != codes.NotFound {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "error",
				"project": projectID,
				"err":     err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "project": projectID})
	}
}
