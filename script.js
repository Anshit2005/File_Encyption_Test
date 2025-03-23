import { AES256 } from './aes.js';

let aes;
let encryptedData;
let fileName;

function generateAESKey() {
    const key = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key
    document.getElementById("aesKey").value = btoa(String.fromCharCode(...key));
    return key;
}

async function encryptFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) return alert("Select a file first");

    const file = fileInput.files[0];
    fileName = file.name;
    const key = generateAESKey();
    aes = new AES256(key);

    encryptedData = await aes.encryptFile(file);

    const blob = new Blob([encryptedData]);
    const url = URL.createObjectURL(blob);

    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = url;
    downloadLink.download = 'encrypted_' + fileName;
    downloadLink.style.display = 'block';
    downloadLink.innerText = 'Download Encrypted File';
    //downloadLink.click();
}

async function decryptFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) return alert("Select an encrypted file first");

    const keyString = document.getElementById("decryptKey").value;
    if (!keyString) return alert("Enter the AES key");
    const key = new Uint8Array(atob(keyString).split("").map(c => c.charCodeAt(0)));

    aes = new AES256(key);

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(event) {
        const encryptedData = new Uint8Array(event.target.result);
        const encryptedBlob = new Blob([encryptedData]); // Ensure it's a Blob
        const decryptedBlob = await aes.decryptFile(encryptedBlob);

        if (decryptedBlob) {
            const url = URL.createObjectURL(decryptedBlob);

            const downloadLink = document.getElementById('downloadLink');
            downloadLink.href = url;
            downloadLink.download = 'decrypted_' + file.name.replace('encrypted_', '');
            downloadLink.innerText = 'Download Decrypted File';
            downloadLink.style.display = 'block';

            //document.body.appendChild(downloadLink);
            //downloadLink.click();
        }
    };
    reader.readAsArrayBuffer(file);
}

function copyKey() {
    const keyField = document.getElementById("aesKey");
    keyField.select();
    document.execCommand("copy");
    alert("AES Key copied to clipboard");
}

// Attach functions to window for global access
window.encryptFile = encryptFile;
window.decryptFile = decryptFile;
window.copyKey = copyKey;
