import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Firebase Admin-ni faqat bir marta initsializatsiya qilish kerak
if (!admin.apps.length) {
  try {
    let serviceAccount: any = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      const candidates = [
        path.join(process.cwd(), "sahiydocsfcm-firebase-adminsdk.json"),
        path.join(process.cwd(), "sahiy-team-firebase-adminsdk-fbsvc-9bd8bfb5d5.json"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          serviceAccount = JSON.parse(fs.readFileSync(candidate, "utf8"));
          break;
        }
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log("Firebase Admin muvaffaqiyatli ishga tushdi (" + serviceAccount.project_id + ").");
    } else {
      console.warn("Firebase Admin: Service account topilmadi.");
    }
  } catch (error) {
    console.error("Firebase Admin ishga tushishda xatolik:", error);
  }
}

export const adminMessaging = admin.apps.length ? admin.messaging() : null;
export const adminStorage = admin.apps.length ? admin.storage() : null;

