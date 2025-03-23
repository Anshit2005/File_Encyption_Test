import * as crypto from 'crypto';

export class RSAKeyExchange {
  private keyPair: crypto.KeyPairKeyObjectResult;

  constructor() {
    this.keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
  }

  exportKeys(): { publicKey: string; privateKey: string } {
    return {
      publicKey: this.keyPair.publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
      privateKey: this.keyPair.privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
    };
  }

  encryptSessionKey(sessionKey: Buffer, peerPublicKey: string): Buffer {
    return crypto.publicEncrypt(peerPublicKey, sessionKey);
  }

  decryptSessionKey(encryptedKey: Buffer): Buffer {
    return crypto.privateDecrypt(this.keyPair.privateKey, encryptedKey);
  }
}
