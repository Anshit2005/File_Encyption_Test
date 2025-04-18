async function generateECCKeys() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true,
        ["deriveKey"]
    );

    const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    console.log("Public Key (Base64):", btoa(String.fromCharCode(...new Uint8Array(publicKey))));
    console.log("Private Key (Base64):", btoa(String.fromCharCode(...new Uint8Array(privateKey))));

    localStorage.setItem("eccPublicKey", btoa(String.fromCharCode(...new Uint8Array(publicKey))));
    localStorage.setItem("eccPrivateKey", btoa(String.fromCharCode(...new Uint8Array(privateKey))));
}

async function deriveSharedSecret(privateKeyBase64, publicKeyBase64) {
    const privateKeyBuffer = new Uint8Array(atob(privateKeyBase64).split("").map(c => c.charCodeAt(0)));
    const publicKeyBuffer = new Uint8Array(atob(publicKeyBase64).split("").map(c => c.charCodeAt(0)));

    const privateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        privateKeyBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );

    const publicKey = await window.crypto.subtle.importKey(
        "spki",
        publicKeyBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    return await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: publicKey },
        privateKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

async function encryptAESKey() {
    const aesKeyInput = document.getElementById("aesKey").value;
    if (!aesKeyInput) return alert("Enter an AES key to encrypt!");

    const publicKeyBase64 = document.getElementById("eccPublicKey").value;
    if (!publicKeyBase64) return alert("Enter a public key!");

    const privateKeyBase64 = localStorage.getItem("eccPrivateKey");
    if (!privateKeyBase64) return alert("No private key found! Generate keys first.");

    const sharedSecret = await deriveSharedSecret(privateKeyBase64, publicKeyBase64);

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        sharedSecret,
        new TextEncoder().encode(aesKeyInput)
    );

    const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
    document.getElementById("encryptedAES").value = btoa(String.fromCharCode(...iv)) + ":" + encryptedBase64;
}

async function decryptAESKey() {
    const encryptedAESInput = document.getElementById("encryptedAES").value;
    if (!encryptedAESInput) return alert("Enter an encrypted AES key!");

    const privateKeyBase64 = document.getElementById("eccPrivateKey").value;
    if (!privateKeyBase64) return alert("Enter a private key!");

    const publicKeyBase64 = localStorage.getItem("eccPublicKey");
    if (!publicKeyBase64) return alert("No public key found! Generate keys first.");

    const [ivBase64, encryptedBase64] = encryptedAESInput.split(":");
    const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
    const encryptedData = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));

    const sharedSecret = await deriveSharedSecret(privateKeyBase64, publicKeyBase64);

    try {
        const decryptedData = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            sharedSecret,
            encryptedData
        );

        document.getElementById("decryptedAES").value = new TextDecoder().decode(decryptedData);
    } catch (e) {
        alert("Decryption failed! Incorrect private key?");
    }
}

window.generateECCKeys = generateECCKeys;
window.encryptAESKey = encryptAESKey;
window.decryptAESKey = decryptAESKey;
