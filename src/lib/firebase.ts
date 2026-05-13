import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDlpIhIMINndkIWV_9gUOc99dmY31OVAlI",
  authDomain: "sahiy-team.firebaseapp.com",
  projectId: "sahiy-team",
  storageBucket: "sahiy-team.firebasestorage.app",
  messagingSenderId: "465897540246",
  appId: "1:465897540246:web:0a4c6adac0e8330d7310b7",
  measurementId: "G-XCX0GDX34K"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let analytics: Analytics | undefined;
let messaging: Messaging | undefined;

if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
  messaging = getMessaging(app);
}

export { app, analytics, messaging };
