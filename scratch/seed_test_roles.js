const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = "mongodb://127.0.0.1:27017/sahiy_docs";
const client = new MongoClient(uri);

const ROLES = [
  "FRONTEND", "BACKEND", "DEVOPS", "QA", "PM", "HR", "VIEWER"
];

async function run() {
  try {
    await client.connect();
    const db = client.db('sahiy_docs');
    
    console.log("Seeding users for each role...");
    
    for (const role of ROLES) {
      const email = `${role.toLowerCase()}@gmail.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await db.collection('users').updateOne(
        { email },
        { 
          $set: {
            name: `${role} User`,
            password: hashedPassword,
            role: role,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log(`Created user: ${email} with role: ${role}`);
    }

    // Ensure Sahiy.uz project allows these roles
    const project = await db.collection('projects').findOne({ name: "Sahiy.uz" });
    if (project) {
      const allRoles = ["SUPER_ADMIN", "ADMIN", ...ROLES];
      await db.collection('projects').updateOne(
        { _id: project._id },
        { $set: { allowedRoles: allRoles } }
      );
      
      // Update Categories
      await db.collection('categories').updateMany(
        { projectId: project._id },
        { $set: { allowedRoles: allRoles } }
      );

      // Update Documents (via categories)
      const categories = await db.collection('categories').find({ projectId: project._id }).toArray();
      const catIds = categories.map(c => c._id);
      
      await db.collection('documents').updateMany(
        { categoryId: { $in: catIds } },
        { $set: { allowedRoles: allRoles } }
      );

      console.log("Updated Sahiy.uz hierarchy (Project, Categories, Docs) allowedRoles to include all seeded roles.");
    }

    console.log("Role-based testing users are ready!");
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
