export class AES256 {
  private key: ArrayBuffer;

  constructor(key: ArrayBuffer) {
      this.key = key;
  }

  async encryptFile(file: Blob): Promise<Blob> {
      const iv: Uint8Array = crypto.getRandomValues(new Uint8Array(16));
      const algorithm: AesCbcParams = { name: "AES-CBC", iv };

      const cryptoKey: CryptoKey = await crypto.subtle.importKey(
          "raw",
          this.key,
          algorithm,
          false,
          ["encrypt"]
      );

      const fileData: ArrayBuffer = await file.arrayBuffer();
      const encryptedData: ArrayBuffer = await crypto.subtle.encrypt(algorithm, cryptoKey, fileData);

      const encryptedBlob: Blob = new Blob([iv, new Uint8Array(encryptedData)]);
      return encryptedBlob;
  }

  async decryptFile(encryptedBlob: Blob): Promise<Blob | null> {
      const data: ArrayBuffer = await encryptedBlob.arrayBuffer();
      const iv: Uint8Array = new Uint8Array(data.slice(0, 16));
      const encryptedData: ArrayBuffer = data.slice(16);

      const algorithm: AesCbcParams = { name: "AES-CBC", iv };

      const cryptoKey: CryptoKey = await crypto.subtle.importKey(
          "raw",
          this.key,
          algorithm,
          false,
          ["decrypt"]
      );

      try {
          const decryptedData: ArrayBuffer = await crypto.subtle.decrypt(algorithm, cryptoKey, encryptedData);
          return new Blob([decryptedData]);
      } catch (error) {
          alert("Decryption failed! Invalid key.");
          return null;
      }
  }
}
