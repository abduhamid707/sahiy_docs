const admin = require("firebase-admin");
const serviceAccount = require("../sahiy-team-firebase-adminsdk-fbsvc-9bd8bfb5d5.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function listBuckets() {
  try {
    const storage = admin.storage();
    const [buckets] = await storage.getBuckets();
    console.log("Available buckets:");
    buckets.forEach(bucket => {
      console.log("- " + bucket.name);
    });
  } catch (error) {
    console.error("Error listing buckets:", error);
  }
}

listBuckets();
