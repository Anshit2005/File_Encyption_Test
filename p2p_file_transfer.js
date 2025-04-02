const signalingServerUrl = 'ws://localhost:8080';
let signalingSocket;
let peerId; // Unique identifier for the user
let fileTransferInProgress = false; // Flag to track ongoing file transfer

// Establish WebSocket connection to signaling server
function connectToSignalingServer() {
    signalingSocket = new WebSocket(signalingServerUrl);

    signalingSocket.onopen = () => {
        console.log('WebSocket connection established');
    };

    signalingSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('Failed to connect to the signaling server. Retrying in 5 seconds...');
        setTimeout(connectToSignalingServer, 5000); // Retry connection
    };

    signalingSocket.onclose = () => {
        console.warn('WebSocket connection closed');
        alert('Connection to the signaling server was lost. Retrying in 5 seconds...');
        setTimeout(connectToSignalingServer, 5000); // Retry connection
    };

    signalingSocket.onmessage = async (event) => {
        try {
            const messageData = typeof event.data === 'string' ? event.data : await event.data.text(); // Convert Blob to text if necessary
            const message = JSON.parse(messageData);

            console.log('Received message:', message); // Debugging: log the entire message

            if (message.peerId) {
                peerId = message.peerId;
                console.log('Assigned peer ID:', peerId); // Debugging: Check if assigned correctly
            }

            if (message.peers) {
                console.log('Received peers list:', message.peers);
                if (!peerId) {
                    console.warn('Warning: peerId is still undefined!');
                }
                updateRecipientDropdown(message.peers);
            }

            // Handle file transfer request
            if (message.action === 'fileTransferRequest' && message.target === peerId) {
                
                // ====================multiple requests===========================
                if (fileTransferInProgress) {
                    console.warn('File transfer already in progress. Ignoring duplicate request.');
                    return; // Ignore duplicate requests
                }

                console.log('Received file transfer request from:', message.sender);
                const accept = confirm(`Peer ${message.sender} wants to send you a file. Do you accept?`);
                if (accept) {
                    fileTransferInProgress = true; // Set flag to true
                    signalingSocket.send(JSON.stringify({ action: 'fileTransferAck', target: message.sender }));
                    console.log('Acknowledgment sent to sender.');
                } else {
                    console.log('File transfer request declined.');
                }
            }

            // Handle offer, answer, and ICE candidates
            if (message.offer && message.target === peerId) {
                console.log('Received offer:', message.offer);
                handleOffer(message.offer, message.target);
            }

            if (message.answer && message.target === peerId) {
                console.log('Received answer:', message.answer);
                await handleAnswer(message.answer); // Ensure async handling
            }

            if (message.candidate && message.target === peerId) {
                console.log('Received ICE candidate:', message.candidate);
                handleCandidate(message.candidate);
            }

        } catch (error) {
            console.error('Error parsing signaling message:', error);
        }
    };
}

connectToSignalingServer();

let peerConnection;
let dataChannel;

// Create a WebRTC offer to send to the recipient
async function createOffer(recipient) {
    console.log('Creating WebRTC offer...');
    peerConnection = new RTCPeerConnection();
    console.log('RTCPeerConnection created.');

    setupDataChannel();
    console.log('Data channel setup completed.');

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('ICE candidate generated:', event.candidate);
            signalingSocket.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    const offer = await peerConnection.createOffer();
    console.log('WebRTC offer created:', offer);

    await peerConnection.setLocalDescription(offer);
    console.log('Local description set with offer.');

    signalingSocket.send(JSON.stringify({ offer, target: recipient }));
    console.log('Offer sent to signaling server with target:', recipient);

    signalingSocket.onmessage = (event) => {
        console.log('Waiting for acknowledgment...');
        const message = JSON.parse(event.data);
        if (message.action === 'fileTransferAck' && message.target === peerId) {
            console.log('Recipient acknowledged. Starting file transfer.');
            sendFileToRecipient();
        }
    };
}

// Setup the data channel for file transfer
// Setup data channel for file transfer
function setupDataChannel() {
    console.log('Setting up data channel...');
    if (!peerConnection) {
        console.error('peerConnection is not initialized.');
        return;
    }

    dataChannel = peerConnection.createDataChannel('fileTransfer');
    console.log('Data channel created.');

    dataChannel.onopen = () => {
        console.log('Data channel open.');
    };
    dataChannel.onclose = () => {
        console.log('Data channel closed.');
        fileTransferInProgress = false; // Reset flag
    };
    dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
        fileTransferInProgress = false; // Reset flag
    };
    dataChannel.onmessage = (event) => {
        console.log('Data received on data channel:', event.data);
        try {
            const message = JSON.parse(event.data);
            if (message.done) {
                console.log('File transfer completed.');
            } else {
                console.log('Received metadata or control message:', message);
            }
        } catch {
            console.log('Received file chunk of size:', event.data.byteLength);
            receiveFile(event.data);
        }
    };
}

// File assembly for received chunks
let receivedChunks = [];
function receiveFile(data) {
    console.log('Processing received file chunk...');
    if (!fileBuffer) {
        fileBuffer = [];
        console.log('Initialized file buffer.');
    }
    fileBuffer.push(data);
    console.log(`Buffered chunk. Total buffered size: ${fileBuffer.reduce((acc, chunk) => acc + chunk.byteLength, 0)} bytes`);

    const progressBar = document.getElementById('receiverProgressBar');

    if (typeof data === 'string') {
        try {
            const message = JSON.parse(data);
            if (message.done) {
                console.log('File transfer complete. Assembling file...');
                const completeFile = new Blob(receivedChunks);
                receivedChunks = []; // Clear chunks after assembly
                console.log('Assembled file:', completeFile);

                // Provide download link for the receiver
                const downloadLink = document.getElementById('receiverDownloadLink');
                const url = URL.createObjectURL(completeFile);
                downloadLink.href = url;
                downloadLink.download = 'received_file';
                downloadLink.style.display = 'block';

                return;
            }
        } catch (error) {
            console.error('Error parsing JSON message:', error);
            alert('An error occurred while processing the file transfer message.');
        }
    } else {
        receivedChunks.push(data);
        console.log(`Received chunk: ${receivedChunks.length}, size: ${data.byteLength} bytes`);
        progressBar.value += data.byteLength;
    }
}

// Function to send a file transfer request to the signaling server
function sendFileToRecipient() {
    console.log('Preparing to send file to recipient...');
    const recipient = document.getElementById('recipientSelect').value;
    if (!recipient) {
        console.error('No recipient selected.');
        alert('Please select a recipient before sending the file.');
        return;
    }

    const fileInput = document.getElementById('fileInput2');
    if (!fileInput.files.length) {
        console.error('No file selected.');
        alert('Please select a file to send.');
        return;
    }

    const file = fileInput.files[0];
    console.log(`File selected: ${file.name}, size: ${file.size} bytes`);

    signalingSocket.send(JSON.stringify({
        target: recipient,
        action: 'fileTransferRequest',
        sender: peerId
    }));
    console.log('File transfer request sent to signaling server.');

    // =========================twice=========================
    createOffer(recipient); // Pass recipient to createOffer
    console.log('Offer creation initiated.');

    const chunkSize = 16 * 1024; // 16 KB
    const reader = new FileReader();
    let offset = 0;

    const progressBar = document.getElementById('senderProgressBar');
    progressBar.max = file.size;
    progressBar.value = 0;

    console.log(`Starting file transfer: ${file.name}, size: ${file.size} bytes`);

    reader.onload = () => {
        const chunk = reader.result;
        console.log(`Read chunk of size: ${chunk.byteLength} bytes`);
        dataChannel.send(chunk);
        console.log(`Sent chunk: ${offset} - ${offset + chunk.byteLength}`);
        offset += chunkSize;
        progressBar.value = offset;

        if (offset < file.size) {
            console.log('Reading next chunk...');
            readSlice(offset);
        } else {
            console.log('All chunks sent. Sending completion message.');
            dataChannel.send(JSON.stringify({ done: true }));
        }
    };

    const readSlice = (o) => {
        console.log(`Reading slice from offset: ${o}`);
        const slice = file.slice(o, o + chunkSize);
        reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
}

// Handle the offer from the signaling server
async function handleOffer(offer) {
    if (fileTransferInProgress) {
        console.warn('File transfer already in progress. Ignoring new offer.');
        return; // Ignore new offers if a transfer is in progress
    }

    if (!peerConnection || peerConnection.signalingState !== 'stable') {
        peerConnection = new RTCPeerConnection(); // Initialize peerConnection if undefined
        setupDataChannel();

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingSocket.send(JSON.stringify({ candidate: event.candidate }));
            }
        };
    }

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalingSocket.send(JSON.stringify({ answer }));

        // Send acknowledgment to the sender after setting the answer
        signalingSocket.send(JSON.stringify({ action: 'fileTransferAck', target: peerId }));
        console.log('Acknowledgment sent to sender after handling offer.');
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

// Handle the answer from the recipient
async function handleAnswer(answer) {
    if (peerConnection.signalingState !== 'have-local-offer') {
        console.warn('PeerConnection is not in "have-local-offer" state. Retrying...');
        return; // Exit early if the state is invalid
    }

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Answer set successfully');
    } catch (error) {
        console.error('Error handling answer:', error);
    }
}

// Handle ICE candidate from the signaling server
async function handleCandidate(candidate) {
    if (!peerConnection) {
        console.error('Peer connection is not initialized. Cannot add ICE candidate.');
        return;
    }

    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
    }
}



// Send file to the recipient
function sendFile(file) {
    if (!dataChannel || dataChannel.readyState !== 'open') {
        console.error('Data channel is not open. Cannot send file.');
        alert('Data channel is not open. Please try again.');
        return;
    }

    const chunkSize = 16 * 1024; // 16 KB
    const reader = new FileReader();
    let offset = 0;

    const progressBar = document.getElementById('senderProgressBar');
    progressBar.max = file.size;
    progressBar.value = 0;

    console.log(`Starting file transfer: ${file.name}, size: ${file.size} bytes`);

    reader.onload = () => {
        const chunk = reader.result;
        dataChannel.send(chunk); // Send file chunks over the WebRTC data channel
        console.log(`Sent chunk: ${offset} - ${offset + chunk.byteLength}`);
        offset += chunkSize;
        progressBar.value = offset;

        if (offset < file.size) {
            readSlice(offset);
        } else {
            console.log('All chunks sent. Sending completion message.');
            dataChannel.send(JSON.stringify({ done: true })); // Send completion message
        }
    };

    const readSlice = (o) => {
        const slice = file.slice(o, o + chunkSize);
        reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
}



// Update the recipient dropdown with peers
function updateRecipientDropdown(peers) {
    console.log('Updating recipient dropdown with peers:', peers);
    const recipientSelect = document.getElementById('recipientSelect');
    recipientSelect.innerHTML = '<option value="" disabled selected>Select Recipient</option>';
    peers
        .filter(peer => peer !== peerId) // Exclude the user's own peer ID
        .forEach(peer => {
            const option = document.createElement('option');
            option.value = peer;
            option.textContent = peer;
            recipientSelect.appendChild(option);
        });
    console.log('Own peer ID:', peerId);
}


