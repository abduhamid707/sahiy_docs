import * as admin from "firebase-admin";
import path from "path";

// Firebase Admin-ni faqat bir marta initsializatsiya qilish kerak
if (!admin.apps.length) {
  try {
    // Fayl loyiha ildizida joylashgan
    const serviceAccount = require("../../sahiy-team-firebase-adminsdk-fbsvc-9bd8bfb5d5.json");
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin muvaffaqiyatli ishga tushdi.");
  } catch (error) {
    console.error("Firebase Admin ishga tushishda xatolik:", error);
  }
}

export const adminMessaging = admin.messaging();
