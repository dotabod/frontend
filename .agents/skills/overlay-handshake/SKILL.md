---
name: overlay-handshake
description: Check the OBS overlay Socket.IO handshake when changing namespace listeners or reconnect behavior.
---

# OBS overlay handshake

A buffered error from a failed namespace attempt must leave the following successful connection open. A streamer who restores their Twitch access must be able to reconnect without reloading OBS.

`formal/overlay-handshake/OverlayHandshake.tla` checks one silent rejection and one successful retry. The server emits `auth_error` before answering the namespace connection, so Socket.IO buffers it. The model follows Socket.IO's order in `Socket.onconnect`: mark the namespace connected, flush buffered events, then notify application listeners. It abstracts timer durations, network loss after connection, and further retries.

- `RejectWithoutReply`, `AcceptNamespace`, and `FlushBufferedError` are Socket.IO behavior covered by the reconnect scenario in `src/__tests__/lib/hooks/use-socket.test.tsx`.
- `HandshakeTimeout` and `RedialAfterBackoff` are the two timers in `createHandshakeGuard` in `src/lib/hooks/socket-handshake-guard.ts`.
- `DisconnectOnAuthError` represents the listener removed in `cd345404`. The overlay socket type in `src/lib/hooks/use-socket.tsx` rejects that listener. Keep the handler on transport and namespace lifecycle signals.

Use the CI job on a feature branch. To reproduce on a development machine, download `tla2tools.jar` from the TLA+ v1.7.4 release, verify SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`, and run `bash formal/overlay-handshake/check.sh /absolute/path/to/tla2tools.jar`. Read both results with `/statechart`. The historical config must fail on `BufferedErrorLeavesAcceptedSocketConnected`.

The shortest historical trace buffers the error, times out, redials, connects, and then disconnects when Socket.IO delivers the old error. To replay the product regression, restore the listener removed by `cd345404` and run the app typecheck in CI. The `auth_error` registration must fail to compile.

The covered code and model were last compared at `6429ca87`. On changes to these paths, check the namespace event ordering and retry ownership before updating that revision.
