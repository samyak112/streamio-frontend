# WebRTC SFU Frontend (React)

This is the frontend client for a custom WebRTC SFU (Selective Forwarding Unit) experiment. It connects to a signaling server over WebSocket and establishes peer-to-peer media streaming via WebRTC.

This is a **demo frontend to test [Monoport](https://github.com/samyak112/monoport)** — a project exploring NAT traversal by multiplexing STUN and SFU over a single UDP port.

## Features

- Connects to a custom signaling server via WebSocket
- Generates a unique `peerId` for each client using UUID
- Sends local audio/video stream to the SFU
- Receives remote media streams (Audio and video) from other peers
- Handles renegotiation and ICE candidates

## Project Structure

- `Stream.js`: Main React component responsible for handling media streams and signaling
- `Watch.js`: Work in progress; currently an empty placeholder

## Heads Up

- No UI for joining/leaving rooms or toggling streams yet
- No TURN server fallback (only STUN used for NAT traversal)
- Meant for demo and experimentation purposes only
