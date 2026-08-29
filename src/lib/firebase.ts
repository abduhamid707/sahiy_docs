import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let analytics: Analytics | undefined;
let messaging: Messaging | undefined;

if (typeof window !== "undefined" && firebaseConfig.apiKey) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn("Firebase Messaging init warning:", e);
  }
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Firebase Analytics init warning:", e);
  }
}

export { app, analytics, messaging };

