import * as crypto from 'crypto';

const message = 'Hello, world!';
const hash = crypto.createHash('sha256').update(message).digest('hex');

console.log('SHA-256 Hash:', hash);
