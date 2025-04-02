import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const peers = new Map(); // Map to store connected peers with unique IDs

wss.on('listening', () => {
    console.log('Signaling server is running on ws://localhost:8080');
});

wss.on('error', (error) => {
    console.error('Signaling server error:', error);
});

wss.on('connection', (ws) => {
    console.log('New client connected');
    const peerId = `peer-${Date.now()}`; // Generate a unique ID for the peer
    peers.set(ws, peerId);

    // Send the peerId to the newly connected client first
    ws.send(JSON.stringify({ peerId }));

    // Notify all clients of the updated peer list after sending peerId
    broadcastPeers();

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message); // Ensure only JSON messages are processed
            console.log(`Message received from ${peerId}:`, parsedMessage);

            // Broadcast the message to all connected clients except the sender
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(parsedMessage)); // Serialize the message as JSON
                }
            });
        } catch (error) {
            console.error('Invalid signaling message received:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Client ${peerId} disconnected`);
        peers.delete(ws);
        broadcastPeers();
    });
});

function broadcastPeers() {
    const peerList = Array.from(peers.values());
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) { // Use WebSocket.OPEN
            client.send(JSON.stringify({ peers: peerList }));
        }
    });
}

console.log('Signaling server running on ws://localhost:8080');
export default wss; // Export the WebSocket server instance for use in other modules