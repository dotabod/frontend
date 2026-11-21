---- MODULE OverlayHandshake ----

CONSTANT DisconnectOnAuthError

VARIABLES phase, bufferedError, retried

vars == <<phase, bufferedError, retried>>

Init ==
  /\ phase = "waiting for namespace"
  /\ bufferedError = FALSE
  /\ retried = FALSE

RejectWithoutReply ==
  /\ phase = "waiting for namespace"
  /\ ~retried
  /\ ~bufferedError
  /\ bufferedError' = TRUE
  /\ UNCHANGED <<phase, retried>>

HandshakeTimeout ==
  /\ phase = "waiting for namespace"
  /\ bufferedError
  /\ ~retried
  /\ phase' = "backing off"
  /\ UNCHANGED <<bufferedError, retried>>

RedialAfterBackoff ==
  /\ phase = "backing off"
  /\ phase' = "waiting for namespace"
  /\ retried' = TRUE
  /\ UNCHANGED bufferedError

AcceptNamespace ==
  /\ phase = "waiting for namespace"
  /\ retried
  /\ phase' = "connected"
  /\ UNCHANGED <<bufferedError, retried>>

FlushBufferedError ==
  /\ phase = "connected"
  /\ bufferedError
  /\ bufferedError' = FALSE
  /\ phase' = IF DisconnectOnAuthError THEN "disconnected by old packet" ELSE "connected"
  /\ UNCHANGED retried

Done ==
  /\ phase \in {"connected", "disconnected by old packet"}
  /\ ~bufferedError
  /\ UNCHANGED vars

Next ==
  RejectWithoutReply \/ HandshakeTimeout \/ RedialAfterBackoff \/ AcceptNamespace
  \/ FlushBufferedError \/ Done

Spec == Init /\ [][Next]_vars

BufferedErrorLeavesAcceptedSocketConnected == phase # "disconnected by old packet"
====
