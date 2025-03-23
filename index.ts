import { AES256 } from './aes';

let aes: AES256 | undefined;
let encryptedData: ArrayBuffer | undefined;
let fileName: string | undefined;

function generateAESKey(): Uint8Array {
    const key = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key
    const aesKeyField = document.getElementById("aesKey") as HTMLInputElement;
    aesKeyField.value = btoa(String.fromCharCode(...key));
    return key;
}

async function encryptFile(): Promise<void> {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Select a file first");
        return;
    }

    const file = fileInput.files[0];
    fileName = file.name;
    const key = generateAESKey();
    aes = new AES256(key);

    encryptedData = await aes.encryptFile(file);

    const blob = new Blob([encryptedData]);
    const url = URL.createObjectURL(blob);

    const downloadLink = document.getElementById('downloadLink') as HTMLAnchorElement;
    downloadLink.href = url;
    downloadLink.download = 'encrypted_' + fileName;
    downloadLink.style.display = 'block';
    downloadLink.innerText = 'Download Encrypted File';
}

async function decryptFile(): Promise<void> {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Select an encrypted file first");
        return;
    }

    const keyString = (document.getElementById("decryptKey") as HTMLInputElement).value;
    if (!keyString) {
        alert("Enter the AES key");
        return;
    }

    const key = new Uint8Array(atob(keyString).split("").map(c => c.charCodeAt(0)));
    aes = new AES256(key);

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function (event) {
        if (!event.target?.result) return;

        const encryptedData = new Uint8Array(event.target.result as ArrayBuffer);
        const encryptedBlob = new Blob([encryptedData]); // Ensure it's a Blob
        if (!aes) {
            alert("AES instance is not initialized.");
            return;
        }
        const decryptedBlob = await aes.decryptFile(encryptedBlob);

        if (decryptedBlob) {
            const url = URL.createObjectURL(decryptedBlob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'decrypted_' + file.name.replace('encrypted_', '');
            downloadLink.innerText = 'Download Decrypted File';
            downloadLink.style.display = 'block';

            document.body.appendChild(downloadLink);
            downloadLink.click();
        }
    };
    reader.readAsArrayBuffer(file);
}

function copyKey(): void {
    const keyField = document.getElementById("aesKey") as HTMLInputElement;
    keyField.select();
    document.execCommand("copy");
    alert("AES Key copied to clipboard");
}

// Attach functions to window for global access
(window as any).uploadFile = () => alert("Upload feature not implemented");
(window as any).encryptFile = encryptFile;
(window as any).decryptFile = decryptFile;
(window as any).copyKey = copyKey;