importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDlpIhIMINndkIWV_9gUOc99dmY31OVAlI",
  authDomain: "sahiy-team.firebaseapp.com",
  projectId: "sahiy-team",
  storageBucket: "sahiy-team.firebasestorage.app",
  messagingSenderId: "465897540246",
  appId: "1:465897540246:web:0a4c6adac0e8330d7310b7",
  measurementId: "G-XCX0GDX34K"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || "Yangi xabar";
  const notificationOptions = {
    body: payload.notification.body || "Sizga yangi xabar keldi",
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
