# PeerShare: P2P File Sharing

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=white)

**PeerShare** is a peer-to-peer file transfer application designed for speed, privacy, and performance. Built with **React Native** and **WebRTC**, it enables users to send files directly between devices over a local network (LAN) without using a third-party cloud.

---

## Demo


https://github.com/user-attachments/assets/55a8efb8-e0f5-4ac1-9882-0acc1d96341d


---

## Key Features

- **True P2P:-** Data travels directly from Device A to Device B. No intermediate storage.
- **Secure:-** No involvement of a third party service makes the file sharing highly secure.
- **Quick:-** Transfers files very fast over a high-speed LAN connection.

---

## Tech Stack

- **Frontend:** React Native, TypeScript
- **Networking:** `react-native-webrtc` (Data Channels)
- **Signaling Server:** Express.js, `ws` (WebSocket)
- **File System:** `react-native-blob-util`, `react-native-documents/picker`
- **Protocol:** ICE (Interactive Connectivity Establishment) via Google STUN.

---

## Installation & Setup

### 1. Clone the Repo

```bash
git clone [**React**'s][https://react.dev/]
cd PeerShare
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install iOS Pods (Mac Only)
```bash
cd ios && pod install && cd ..
````

### 4. Start Signaling Server
```bash
cd backend && npm i && npm run dev
````

### 5. Launch the application
```bash
npx react-native run-android
npx react-native run-ios
```

##### Make sure you add your local ip-address in /src/services/PeerConnection.ts

---

## Future Scopes

- Resume broken transfers.
- QR Code scanning for instant pairing.
- End-to-end encryption for file streams.
- Multi-file selection support.

---
