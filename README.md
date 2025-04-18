# File_Encryption_Test

This repository is created to test file encryption using **AES-256** and **Elliptic Curve Cryptography (ECC)**. The project demonstrates the use of **public-private key encryption**, a **shared session key**, and an **encrypted AES key** to ensure secure file encryption and decryption.

## 🔐 Features

- **AES-256 Encryption** for fast and secure symmetric encryption of files.
- **Elliptic Curve Cryptography (ECC)** for secure key exchange.
- **Encrypted AES Key** using ECC public-private key pairs.
- **Session Key Exchange** using ECC to generate a shared secret for AES encryption.

## 📁 How It Works

1. **Key Generation**:  
   - ECC public-private key pairs are generated for sender and receiver.
   - A shared session key is derived using ECC (e.g., ECDH - Elliptic Curve Diffie-Hellman).

2. **AES Key Handling**:  
   - A random AES-256 key is generated.
   - This AES key is encrypted using the receiver’s ECC public key.

3. **File Encryption**:  
   - Files are encrypted using AES-256 in CBC or GCM mode.
   - The AES key used for encryption is not stored in plaintext.

4. **Decryption**:  
   - The receiver decrypts the AES key using their ECC private key.
   - The file is decrypted using the recovered AES key.

## 🛠 Technologies Used

- Python (or your language of choice)
- AES-256 (from cryptography library or equivalent)
- ECC (such as SECP256R1 or Curve25519)
- Cryptographic Libraries: `cryptography`, `PyCryptodome`, or others

## 📌 Use Cases

- Secure file transmission
- Hybrid encryption testing
- ECC and AES integration in secure apps
- Learning and demonstration of public-private key cryptography with AES

## 🚧 Status

This repository is currently under testing and development for:
- Performance evaluation
- Encryption correctness
- Secure key exchange implementations

## 📜 License

This project is for testing and educational purposes.
