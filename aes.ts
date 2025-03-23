export class AES256 {
  constructor(key) {
      this.key = key;
  }

  async encryptFile(file) {
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const algorithm = { name: "AES-CBC", iv };

      const cryptoKey = await crypto.subtle.importKey(
          "raw",
          this.key,
          algorithm,
          false,
          ["encrypt"]
      );

      const fileData = await file.arrayBuffer();
      const encryptedData = await crypto.subtle.encrypt(algorithm, cryptoKey, fileData);

      const encryptedBlob = new Blob([iv, new Uint8Array(encryptedData)]);
      return encryptedBlob;
  }

  async decryptFile(encryptedBlob) {
      const data = await encryptedBlob.arrayBuffer();
      const iv = new Uint8Array(data.slice(0, 16));
      const encryptedData = data.slice(16);

      const algorithm = { name: "AES-CBC", iv };

      const cryptoKey = await crypto.subtle.importKey(
          "raw",
          this.key,
          algorithm,
          false,
          ["decrypt"]
      );

      try {
          const decryptedData = await crypto.subtle.decrypt(algorithm, cryptoKey, encryptedData);
          return new Blob([decryptedData]);
      } catch (error) {
          alert("Decryption failed! Invalid key.");
          return null;
      }
  }
}
