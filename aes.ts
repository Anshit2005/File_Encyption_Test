import * as crypto from 'crypto';

export class AES256 {
  private key!: CryptoKey;

  constructor(key: Uint8Array) {
    this.importKey(key);
  }

  private async importKey(rawKey: Uint8Array) {
    this.key = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-CBC" },
      false,
      ["encrypt", "decrypt"]
    );
  }
  async encryptFile(file: File): Promise<Uint8Array> {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const mimeType = file.type; // Get the MIME type of the file

    const fileData = new Uint8Array(await file.arrayBuffer());
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv },
      this.key,
      fileData
    );

    // Prepend the MIME type length and MIME type to the encrypted data
    const mimeTypeBytes = new TextEncoder().encode(mimeType);
    const mimeTypeLength = new Uint8Array([mimeTypeBytes.length]);

    return new Uint8Array([
      ...mimeTypeLength,
      ...mimeTypeBytes,
      ...iv,
      ...new Uint8Array(encryptedData),
    ]);
  }

  async decryptFile(encryptedData: Uint8Array): Promise<File> {
    // Extract the MIME type length and MIME type
    const mimeTypeLength = encryptedData[0];
    const mimeTypeBytes = encryptedData.slice(1, 1 + mimeTypeLength);
    const mimeType = new TextDecoder().decode(mimeTypeBytes);

    const iv = encryptedData.slice(1 + mimeTypeLength, 17 + mimeTypeLength);
    const data = encryptedData.slice(17 + mimeTypeLength);

    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      this.key,
      data
    );

    const fileBlob = new Blob([new Uint8Array(decryptedData)], { type: mimeType });
    return new File([fileBlob], "decrypted_file", { type: mimeType });
  }
}