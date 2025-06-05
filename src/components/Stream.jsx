import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

function Stream() {
	const [uuid, setUuid] = useState(null);
	const [createConn, setCreateConn] = useState(false)
	const wsRef = useRef(null);
	const pcRef = useRef(false);
	const testRef = useRef(0)

	// Generate UUID once on mount
	useEffect(() => {
		const id = uuidv4();
		console.log("UUID generated:", id);
		setUuid(id);
	}, []);

	// WebSocket effect — runs only after UUID is ready
	useEffect(() => {
		if (!uuid) return; // exit if uuid not ready

		const ws = new WebSocket('ws://127.0.0.1:8000/'); // Adjust URL as needed
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

			if (message.type === 'offer' || message.type === 'answer') { // Also handle 'answer' if this client is an offerer
				const description = new RTCSessionDescription(message);
				pcRef.current.setRemoteDescription(description)
					.then(() => {
						console.log(`Remote description (${message.type}) set successfully!`);
					})
					.catch(error => {
						console.error(`Error setting remote description (${message.type}):`, error);
						// This is a critical error, connection likely won't establish
					});
			} else if (message.type === 'ice-candidate' || message.type === 'candidate') { // Allow for 'candidate' as well
				if (message.candidate) { // Ensure candidate object exists
					const candidate = new RTCIceCandidate(JSON.parse(message.candidate));
					pcRef.current.addIceCandidate(candidate)
						.then(() => {
							console.log('ICE candidate added successfully:', message.candidate);
						})
						.catch(error => {
							console.error('Error adding ICE candidate:', error, message.candidate);
							// This might not be fatal if other candidates work, but it's not good.
						});
				} else {
					console.warn('Received ice-candidate message without a candidate object:', message);
				}
			}
		};
		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};
		ws.onclose = () => {
			console.log('WebSocket disconnected');
		};

		return () => {
			ws.close();
		};
	}, [uuid]);

	// PeerConnection effect — runs only after UUID is ready
	useEffect(() => {
		if (!createConn) return; // exit if uuid not ready

		const config = {
			iceServers: [{ urls: 'stun:localhost:5000' }],
		};
		pcRef.current = new RTCPeerConnection(config);

		pcRef.current.createDataChannel('dummy');


		pcRef.current.ontrack = (event) => {
			const remoteStream = new MediaStream();

			// Add all received tracks to the remoteStream
			event.streams[0].getTracks().forEach(track => {
				remoteStream.addTrack(track);
			});

			// Optional: log what you got
			console.log("Received remote track(s):", event.track.kind, event.track.id);

			// Attach to a video element
			const remoteVideo = document.getElementById('remoteVideo');
			if (remoteVideo) {
				remoteVideo.srcObject = remoteStream;
			}
		};

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


		navigator.mediaDevices.getUserMedia({ audio: true, video: true })
			.then((stream) => {
				// Add all tracks to the connection
				stream.getTracks().forEach((track) => {
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
		return () => {
			pcRef.current.close();
		};
	}, [createConn]);

	return <div>
		Check the console for ICE candidates.
		<video id="localVideo" autoPlay playsInline muted />
	</div>;

}

export default Stream;
