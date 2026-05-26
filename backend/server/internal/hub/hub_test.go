package hub

import "testing"

func TestRegisterReplacesExistingPlayerConnection(t *testing.T) {
	h := New()
	oldClient := NewClient("ROOM1", "player-1", nil)
	newClient := NewClient("ROOM1", "player-1", nil)

	h.Register(oldClient)
	h.Register(newClient)

	if !h.IsCurrent(newClient) {
		t.Fatalf("expected new client to become current")
	}
	if oldClient.CloseReason() != "replaced" {
		t.Fatalf("expected old client close reason to be replaced, got %q", oldClient.CloseReason())
	}

	select {
	case _, ok := <-oldClient.Send:
		if ok {
			t.Fatalf("expected replaced client's send channel to be closed")
		}
	default:
		t.Fatalf("expected replaced client's send channel to be closed immediately")
	}

	if h.Unregister(oldClient) {
		t.Fatalf("expected unregistering old client to be ignored")
	}
	if !h.Unregister(newClient) {
		t.Fatalf("expected unregistering current client to succeed")
	}
}
