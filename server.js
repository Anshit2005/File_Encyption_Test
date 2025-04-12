import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const peers = new Map();

wss.on('connection', (ws) => {
    let peerId = null;

    // Send the updated list of peers to the new connection
    const updatePeersList = () => {
        const peerList = [...peers.keys()].filter(id => id !== peerId);
        // Send the updated list to all peers
        peers.forEach((peerSocket, id) => {
            peerSocket.send(JSON.stringify({
                type: 'peers',
                peers: peerList
            }));
        });
    };

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'register':
                peerId = data.peerId;
                peers.set(peerId, ws);
                console.log(`Peer registered: ${peerId}`);
                updatePeersList();  // Update all peers with the new peer list
                break;

            case 'list-peers':
                // Send the current list of peers to the requesting peer
                ws.send(JSON.stringify({
                    type: 'peers',
                    peers: [...peers.keys()].filter(id => id !== peerId)
                }));
                break;

            case 'connect-request':
                const target = peers.get(data.targetId);
                // console.log(`Server debug: ${target}`);
                if (target) {
                    target.send(JSON.stringify({
                        type: 'connect-request',
                        from: peerId
                    }));
                }
                break;

            case 'connect-response':
                const requester = peers.get(data.to);
                if (requester) {
                    requester.send(JSON.stringify({
                        type: 'connect-response',
                        accepted: data.accepted,
                        from: peerId
                    }));
                }
                break;

            case 'signal':
                const dest = peers.get(data.to);
                if (dest) {
                    dest.send(JSON.stringify({
                        type: 'signal',
                        from: peerId,
                        signal: data.signal
                    }));
                }
                break;
        }
    });

    ws.on('close', () => {
        if (peerId) {
            peers.delete(peerId);
            console.log(`Peer disconnected: ${peerId}`);
            updatePeersList();  // Update all peers with the new list after a disconnection
        }
    });
});

console.log('Signaling server running on ws://localhost:8080');
