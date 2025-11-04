# 💰 Palm Pay - Mobile Payment Application

<div align="center">

<img src="./assets/planful.png" alt="Palm Pay Logo" width="120">

**A Modern, Secure, and Feature-Rich Mobile Payment Solution**



[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61dafb?style=for-the-badge&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0-000020?style=for-the-badge&logo=expo)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.2.1-ffca28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-0BSD-blue?style=for-the-badge)](LICENSE)

[Features](#-features) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [Documentation](#-documentation)

</div>
</div>
---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the App](#-running-the-app)
- [Building APK](#-building-apk)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌟 Overview

**Palm Pay** is a cutting-edge mobile payment application built with React Native and Expo, designed to provide seamless peer-to-peer money transfers with real-time notifications and QR code scanning capabilities. The app leverages Firebase for backend services, ensuring secure authentication and real-time data synchronization.

### Key Highlights

- 🔐 **Secure Authentication** - Firebase-based user authentication with email verification
- 💸 **Instant Transfers** - Send and receive money in real-time
- 📱 **QR Code Payments** - Scan QR codes to send money instantly
- 🔔 **Push Notifications** - Real-time transaction and payment notifications
- 📊 **Transaction History** - Complete transaction tracking with filters
- 👤 **User Profiles** - Comprehensive user account management
- 🎨 **Modern UI/UX** - Beautiful, intuitive interface with smooth animations

---

## ✨ Features

### 🔐 Authentication & Security

- **Email/Password Authentication**
  - Secure user registration with email verification
  - Password strength validation
  - Forgot password functionality
  - Session management with Firebase Auth

- **User Data Protection**
  - Encrypted data transmission
  - Secure Firebase Firestore rules
  - CNIC-based user verification
  - Protected API endpoints

### 💰 Payment Features

- **Send Money**
  - Search recipients by email or CNIC
  - Recent recipients quick access
  - Amount validation and balance checking
  - Optional transaction notes
  - Transaction confirmation screen

- **Receive Money**
  - QR code generation for your account
  - Instant payment reception
  - Real-time balance updates
  - Transaction notifications

- **QR Code Scanner**
  - Built-in camera integration
  - Fast QR code scanning
  - Automatic recipient selection
  - Secure payment initiation

### 📊 Dashboard & Analytics

- **Real-time Balance Display**
  - Animated balance updates
  - Currency formatting (Pakistani Rupees)
  - Quick QR code access

- **Recent Transactions**
  - Last 5 transactions overview
  - Color-coded transaction types (sent/received)
  - Transaction timestamps
  - View all transactions option

### 🔔 Notifications

- **In-App Notifications**
  - Transaction alerts
  - Payment confirmations
  - Real-time notification feed
  - Notification history

- **Local Push Notifications**
  - Custom notification sounds
  - Transaction completion alerts
  - Payment received notifications
  - Configurable notification preferences

### 📜 Transaction Management

- **Complete History**
  - All transactions list
  - Filter by type (sent/received)
  - Date-based filtering (today, week, month)
  - Transaction details view
  - Transaction status tracking

### 👤 User Profile

- **Account Information**
  - Full name and father's name
  - CNIC (Computerized National Identity Card)
  - Email address
  - Current balance display

- **Settings**
  - Password change functionality
  - Account security options
  - Notification preferences

---

## 🛠 Tech Stack

### Frontend

- **React Native** `0.81.5` - Cross-platform mobile framework
- **Expo** `54.0` - Development platform and build tool
- **React** `19.1.0` - JavaScript library for UI

### UI Components & Styling

- **React Native Animatable** - Animations and transitions
- **React Native Reanimated** `4.1.1` - Advanced animations
- **Expo Linear Gradient** - Gradient backgrounds
- **Expo Blur** - Blur effects
- **Ionicons** - Icon library
- **Anton Font** - Custom typography

### Backend & Database

- **Firebase Auth** - User authentication
- **Firebase Firestore** `12.2.1` - Real-time NoSQL database
- **Firebase Cloud Functions** - Serverless backend logic

### Features & Integrations

- **Expo Camera** `17.0.8` - QR code scanning
- **Expo Notifications** `0.32.12` - Local push notifications
- **Expo Audio** `1.0.14` - Notification sounds
- **React Native QRCode SVG** - QR code generation
- **React Native Gesture Handler** - Touch interactions
- **Async Storage** `2.2.0` - Local data persistence

### Development Tools

- **Babel** - JavaScript compiler
- **Metro** - JavaScript bundler
- **EAS Build** - Cloud build service
- **Expo CLI** - Command-line interface

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
  ```bash
  node --version
  ```

- **npm** or **yarn**
  ```bash
  npm --version
  ```

- **Expo CLI**
  ```bash
  npm install -g expo-cli
  ```

- **EAS CLI** (for building APK)
  ```bash
  npm install -g eas-cli
  ```

- **Expo Go App** (on your mobile device)
  - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS](https://apps.apple.com/app/expo-go/id982107779)

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/palm-pay-mobile.git
cd palm-pay-mobile
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** (Email/Password)
4. Create a **Firestore Database**
5. Download your `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)

### Step 4: Configure Firebase

Create a `firebase.js` file in the root directory:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Step 5: Configure app.json

Update the `app.json` with your project details:

```json
{
  "expo": {
    "name": "Palm Pay",
    "slug": "palm-pay",
    "version": "1.0.0",
    "owner": "your-expo-username"
  }
}
```

---

## ⚙️ Configuration

### Firebase Firestore Rules

Set up the following security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // User transactions subcollection
      match /transactions/{transactionId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User notifications subcollection
      match /notifications/{notificationId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Firebase Authentication

Enable **Email/Password** authentication in Firebase Console:

1. Go to Authentication → Sign-in method
2. Enable Email/Password provider
3. Configure email templates (optional)

---

## 🏃 Running the App

### Development Mode

Start the Expo development server:

```bash
npx expo start
```

### Run on Android

```bash
npx expo start --android
```

### Run on iOS

```bash
npx expo start --ios
```

### Run on Web

```bash
npx expo start --web
```

### Clear Cache

If you encounter issues, clear the cache:

```bash
npx expo start -c
```

---

## 📦 Building APK

### Step 1: Login to EAS

```bash
eas login
```

### Step 2: Configure EAS Build

The project already has `eas.json` configured. Review it:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Step 3: Build APK

For preview/testing (APK):

```bash
eas build -p android --profile preview
```

For production (AAB):

```bash
eas build -p android --profile production
```

### Step 4: Download APK

After the build completes, download the APK from:
- The link provided in the terminal
- [Expo Dashboard](https://expo.dev)

---

## ?? Project Structure

```
palm-pay-mobile/
+-- assets/                          # Static assets
�   +-- planful.png                 # App icon and logo
�   +-- adaptive_icon.png           # Android adaptive icon
�   +-- favicon.png                 # Web favicon
�   +-- transaction.mp3             # Transaction sound
�   +-- new_notification_09_352705.mp3  # Notification sound
�
+-- App.js                          # Main app entry point
+-- Home.js                         # Home screen and main logic
+-- firebase.js                     # Firebase configuration
+-- index.js                        # App registration

 app.json                        # Expo configuration
 eas.json                        # EAS Build configuration
 babel.config.js                 # Babel configuration
 metro.config.js                 # Metro bundler configuration

 package.json                    # Dependencies
 package-lock.json               # Lock file
 README.md                       # This file
```

---

##  API Documentation

### User Authentication

#### Sign Up
```javascript
createUserWithEmailAndPassword(auth, email, password)
```

**Parameters:**
- email (string): User's email address
- password (string): User's password (min 6 characters)

**Returns:** User credential object

#### Sign In
```javascript
signInWithEmailAndPassword(auth, email, password)
```

**Parameters:**
- email (string): User's email address
- password (string): User's password

**Returns:** User credential object

#### Sign Out
```javascript
signOut(auth)
```

**Returns:** Promise

### Firestore Operations

#### Create User Document
```javascript
await setDoc(doc(db, 'users', userId), {
  fullName: string,
  fatherName: string,
  cnic: string,
  email: string,
  balance: number,
  emailVerified: boolean,
  createdAt: serverTimestamp()
});
```

#### Get User Data
```javascript
const userDoc = await getDoc(doc(db, 'users', userId));
const userData = userDoc.data();
```

#### Create Transaction
```javascript
await addDoc(collection(db, 'users', userId, 'transactions'), {
  type: 'send' | 'receive',
  amount: number,
  recipientId: string,
  recipientName: string,
  senderId: string,
  senderName: string,
  note: string,
  status: 'completed',
  timestamp: serverTimestamp()
});
```

#### Query Transactions
```javascript
const transactionsQuery = query(
  collection(db, 'users', userId, 'transactions'),
  orderBy('timestamp', 'desc'),
  limit(20)
);
const transactionsSnap = await getDocs(transactionsQuery);
```

### Transaction Flow

1. **Sender initiates payment**
   - Validates recipient
   - Checks balance
   - Shows confirmation

2. **Execute transaction** (Atomic operation)
   ```javascript
   await runTransaction(db, async (transaction) => {
     // Deduct from sender
     // Add to recipient
     // Create transaction records
   });
   ```

3. **Create notifications**
   - Sender notification
   - Recipient notification

4. **Play sound**
   ```javascript
   const player = new AudioPlayer(require('./assets/transaction.mp3'));
   await player.play();
   ```

---

##  Security

### Best Practices Implemented

1. **Authentication**
   - Firebase Authentication for secure login
   - Email verification required
   - Password strength validation
   - Secure session management

2. **Data Protection**
   - Firestore security rules
   - User data isolation
   - Encrypted connections (HTTPS)
   - Input validation and sanitization

3. **Transaction Security**
   - Atomic operations using Firestore transactions
   - Balance validation before transfer
   - Duplicate transaction prevention
   - Transaction ID generation

4. **CNIC Verification**
   - 13-digit CNIC format validation
   - Format: 12345-1234567-1
   - Unique identifier for users

### Security Recommendations

- Never commit irebase.js with real credentials
- Use environment variables for sensitive data
- Enable 2FA for Firebase Console
- Regularly update dependencies
- Monitor Firebase usage and costs
- Implement rate limiting
- Add biometric authentication (future enhancement)

---

##  Troubleshooting

### Common Issues and Solutions

#### 1. Build Failed - Package Lock Sync Error

**Problem:**
```
npm ci can only install packages when package.json and package-lock.json are in sync
```

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
eas build -p android --profile preview --clear-cache
```

#### 2. Expo Go Connection Failed

**Problem:** Can't connect to development server

**Solutions:**
- Ensure both devices are on same WiFi
- Check Windows Firewall settings
- Use tunnel mode: 
px expo start --tunnel
- Manually enter URL in Expo Go

#### 3. Firebase Authentication Error

**Problem:** Authentication fails

**Solutions:**
- Check Firebase configuration in irebase.js
- Enable Email/Password in Firebase Console
- Verify API keys are correct
- Check Firebase quota limits

#### 4. QR Scanner Not Working

**Problem:** Camera not opening

**Solutions:**
- Grant camera permissions
- Check expo-camera installation
- Verify camera permission in pp.json
- Test on physical device (not emulator)

#### 5. Notifications Not Showing

**Problem:** Local notifications not appearing

**Solutions:**
- Check notification permissions
- Verify expo-notifications setup
- Test on physical device
- Check notification handler configuration

#### 6. Build Timeout on EAS

**Problem:** Build takes too long or times out

**Solutions:**
```bash
eas build -p android --profile preview --clear-cache
```
- Check EAS Build logs
- Verify all dependencies are compatible
- Remove unnecessary packages

### Getting Help

If you encounter issues not listed here:

1. Check [Expo Documentation](https://docs.expo.dev/)
2. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
3. Visit [Expo Forums](https://forums.expo.dev/)
4. Create an issue on GitHub

---

##  Testing

### Manual Testing Checklist

- [ ] User registration with email verification
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Forgot password flow
- [ ] Send money to existing user
- [ ] Send money with insufficient balance
- [ ] Receive money notification
- [ ] QR code generation
- [ ] QR code scanning and payment
- [ ] Transaction history filtering
- [ ] Profile information display
- [ ] Password change
- [ ] Logout functionality
- [ ] Notification sounds
- [ ] Balance updates in real-time

### Test Accounts

Create test accounts with sample data:

```javascript
// User 1
{
  email: "user1@test.com",
  password: "test123",
  balance: 10000
}

// User 2
{
  email: "user2@test.com",
  password: "test123",
  balance: 5000
}
```

---

##  Performance Optimization

### Implemented Optimizations

1. **Lazy Loading**
   - Components loaded on demand
   - Reduced initial bundle size

2. **Memoization**
   - React.memo for expensive components
   - useMemo for complex calculations

3. **Pagination**
   - Limited transaction queries
   - Load more on scroll

4. **Image Optimization**
   - Compressed asset files
   - Appropriate image resolutions

5. **Code Splitting**
   - Separate screens and components
   - Reduced memory footprint

---

##  Future Enhancements

### Planned Features

- [ ] **Biometric Authentication** - Fingerprint/Face ID
- [ ] **Multi-currency Support** - USD, EUR, etc.
- [ ] **Recurring Payments** - Schedule automatic transfers
- [ ] **Payment Links** - Generate shareable payment links
- [ ] **Bill Splitting** - Split bills with friends
- [ ] **Transaction Receipts** - PDF generation
- [ ] **Dark Mode** - Theme switching
- [ ] **Analytics Dashboard** - Spending insights
- [ ] **Contact Integration** - Import phone contacts
- [ ] **Push Notifications** - Remote notifications via FCM
- [ ] **Referral System** - Invite friends and earn
- [ ] **KYC Verification** - Enhanced security
- [ ] **Multi-language Support** - Urdu, English, etc.
- [ ] **Offline Mode** - Queue transactions offline

---

##  License

This project is licensed under the **0BSD License** - see the [LICENSE](LICENSE) file for details.

### 0BSD License

```
Copyright (C) 2025 Palm Pay

Permission to use, copy, modify, and/or distribute this software for
any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES
OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE
FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY
DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN
AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT
OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

##  Contributing

We welcome contributions! Please follow these steps:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```

3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```

4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```

5. **Open a Pull Request**

### Code Style Guidelines

- Use ESLint and Prettier
- Follow React Native best practices
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation

---

##  Contact

**Developer:** Palm Pay Team  
**Email:** support@palmpay.com  
**Website:** [https://palmpay.com](https://palmpay.com)  
**Expo Project:** [Palm Pay on Expo](https://expo.dev/@oyemrsaqib/palm-pay)

### Social Media

- Twitter: [@palmpay](https://twitter.com/palmpay)
- LinkedIn: [Palm Pay](https://linkedin.com/company/palmpay)
- GitHub: [@palmpay](https://github.com/palmpay)

---

##  Acknowledgments

- [Expo Team](https://expo.dev/) for the amazing platform
- [Firebase](https://firebase.google.com/) for backend services
- [React Native Community](https://reactnative.dev/) for the framework
- All contributors and testers

---

##  Project Stats

![GitHub Stars](https://img.shields.io/github/stars/yourusername/palm-pay-mobile?style=social)
![GitHub Forks](https://img.shields.io/github/forks/yourusername/palm-pay-mobile?style=social)
![GitHub Issues](https://img.shields.io/github/issues/yourusername/palm-pay-mobile)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/yourusername/palm-pay-mobile)

---

<div align="center">

**Made with  by Palm Pay Team**

 Star this repository if you find it helpful!

[Back to Top](#-palm-pay---mobile-payment-application)

</div>
