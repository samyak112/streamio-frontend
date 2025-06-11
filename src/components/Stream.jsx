import React, { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid';

function Stream() {
	const [uuid, setUuid] = useState(null);
	const [createConn, setCreateConn] = useState(false)
	const [IsSDP, setISSDP] = useState(false)
	const wsRef = useRef(null);
	const pcRef = useRef(null);
	const testRef = useRef(0)
	const [currentState, setCurrentState] = useState(null)

	const [remoteStreams, setRemoteStreams] = useState([]);
	const videoRefs = useRef([]);

	// Generate UUID once on mount
	useEffect(() => {
		const id = uuidv4();
		console.log("UUID generated:", id);
		setUuid(id);
	}, []);

	// WebSocket effect — runs only after UUID is ready
	useEffect(() => {
		if (!uuid) return; // exit if uuid not ready

		const ws = new WebSocket('wss://monoport.xyz/sdp');

		// const ws = new WebSocket('ws://127.0.0.1:8000/sdp');
		wsRef.current = ws;

		ws.onopen = () => {
			console.log('WebSocket connected');
			ws.send(JSON.stringify({ type: 'join-room', peerId: uuid }));
			setCreateConn(true)
		};

		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			console.log(message);
			// Assume pcRef.current is your RTCPeerConnection instance
			// Assume 'message' is the incoming signaling message

			switch (message.type) {
				case 'answer':
					// This case handles the answer to our initial offer
					console.log("Received answer from server");
					pcRef.current.setRemoteDescription(new RTCSessionDescription(message))
						.catch(error => console.error("Error setting remote description for answer:", error));
					break;

				case 'offer':
					// This case handles renegotiation offers FROM the server
					console.log("Received renegotiation offer from server");
					pcRef.current.setRemoteDescription(new RTCSessionDescription(message))
						.then(() => pcRef.current.createAnswer())
						.then(answer => pcRef.current.setLocalDescription(answer))
						.then(() => {
							// Send the answer back to the server
							if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
								wsRef.current.send(
									JSON.stringify({
										type: 'answer', // We are sending an answer
										peerId: uuid,
										sdp: pcRef.current.localDescription.sdp,
									})
								);
								console.log("Sent answer back to server");
							}
						})
						.catch(error => console.error("Error handling offer from server:", error));
					break;
				case 'stun-candidate':
					console.log('this is the stun ice', message)

					JSON.stringify({
						type: 'ice-candidate',
						peerId: uuid,
						candidate: JSON.stringify(message.stunCandidate),
					})
					break;

				case 'candidate':
				case 'ice-candidate':
					if (message.candidate) {
						try {
							const candidate = new RTCIceCandidate(JSON.parse(message.candidate));
							pcRef.current.addIceCandidate(candidate)
								.catch(error => console.error('Error adding ICE candidate:', error));
						} catch (e) {
							console.error("Error parsing ICE candidate JSON", e);
						}
					}
					break;

				default:
					console.warn("Received unknown message type:", message.type);
			}
		};
		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};
		ws.onclose = (error) => {
			console.log('WebSocket disconnected', error);
		};

		return () => {
			ws.close();
		};
	}, [uuid]);

	// PeerConnection effect — runs only after UUID is ready
	useEffect(() => {
		if (!createConn) return; // exit if uuid not ready

		const config = {
			iceServers: [{ urls: 'stun:34.44.36.231:5000' }],

			// iceServers: [{ urls: 'stun:127.0.0.1:5000' }],
		};

		if (!pcRef.current) {

			pcRef.current = new RTCPeerConnection(config);
		}




		pcRef.current.createDataChannel("control");

		// pcRef.current.addTransceiver("audio", { direction: "sendonly" });
		pcRef.current.ontrack = (event) => {
			const incomingStream = event.streams[0];
			if (!incomingStream) return;

			console.log("Track kind:", event.track.kind, "Stream ID:", incomingStream.id);

			// Use a state updater to append if it's a new stream
			setRemoteStreams((prev) => {
				const alreadyExists = prev.some((s) => s.id === incomingStream.id);
				return alreadyExists ? prev : [...prev, incomingStream];
			});
		};

		// if (IsSDP) {
		pcRef.current.onicecandidate = (event) => {
			console.log(event);
			if (event.candidate) {
				if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
					wsRef.current.send(
						JSON.stringify({
							type: 'ice-candidate',
							peerId: uuid,
							candidate: JSON.stringify(event.candidate),
						})
					);
				}
				testRef.current = testRef.current + 1;
				console.log('New ICE candidate:', event.candidate.candidate);
			} else {
				console.log(testRef.current);
				console.log('ICE gathering complete.');
			}
		};

		// }

		pcRef.current.onconnectionstatechange = () => {
			setCurrentState(`Connection state: ${pcRef.current.connectionState}`)
			console.log("Connection state:", pcRef.current.connectionState);
		};


		pcRef.current.oniceconnectionstatechange = () => {
			setCurrentState(`ICE connection state: ${pcRef.current.iceConnectionState}`);

			if (pcRef.current.iceConnectionState === 'failed') {

				setCurrentState(`ICE connection failed! Candidates are not connecting`);
				console.error('ICE connection failed! Candidates are not connecting.');
			} else if (pcRef.current.iceConnectionState === 'disconnected') {

				setCurrentState(`ICE connection disconnected.`);
				console.warn('ICE connection disconnected.');
			} else if (pcRef.current.iceConnectionState === 'closed') {

				setCurrentState(`ICE connection closed.`);
				console.warn('ICE connection closed.');
			}
		};
		navigator.mediaDevices.getUserMedia({ audio: true, video: true })
			.then((stream) => {
				// Add all tracks to the connection
				stream.getTracks().forEach((track) => {
					console.log('sending track', track, stream)
					pcRef.current.addTrack(track, stream);
				});

				// Optional local preview
				const video = document.getElementById('localVideo');
				if (video) {
					video.srcObject = stream;
				}

				pcRef.current
					.createOffer()
					.then((offer) => pcRef.current.setLocalDescription(offer))
					.then(() => {
						if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
							wsRef.current.send(
								JSON.stringify({
									type: 'offer',
									peerId: uuid,
									sdp: pcRef.current.localDescription.sdp,
								})
							);

						}
					})
			})
			.catch((err) => {
				console.error('Failed to get media:', err);
			});
	}, [createConn]);

	return (
		<div>
			{/* Local preview */}
			<video
				id="localVideo"
				autoPlay
				muted
				playsInline
				style={{
					width: '300px', border: '2px solid green',
					transform: 'scaleX(-1)',
				}}
			/>

			{/* Remote peers */}
			<div style={{ display: 'flex', flexWrap: 'wrap' }}>
				{remoteStreams.map((stream, i) => (
					<video
						key={stream.id}
						ref={(el) => {
							if (el && el.srcObject !== stream) {
								el.srcObject = stream;
							}
						}}
						autoPlay
						playsInline
						style={{ width: '300px', margin: '10px', border: '1px solid black' }}
					/>
				))}
			</div>
			{currentState}
		</div>
	);

}

export default Stream;
