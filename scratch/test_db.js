const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://127.0.0.1:27017/sahiy_docs";

async function test() {
  try {
    console.log("Connecting to:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully");
    
    const db = mongoose.connection.db;
    const adminEmail = "admin@gmail.com";
    const user = await db.collection('users').findOne({ email: adminEmail });
    
    if (!user) {
      console.log("Creating admin user...");
      await db.collection('users').insertOne({
        name: "Admin User",
        email: adminEmail,
        password: "admin",
        role: "SUPER_ADMIN",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("Admin user created.");
    }

    // Seed Projects
    const projects = [
      { name: "Sahiy.uz", description: "Main marketplace platform", allowedRoles: ["VIEWER", "ADMIN", "SUPER_ADMIN"], techStack: ["Next.js", "NestJS", "MongoDB"] },
      { name: "Seller Panel", description: "Seller management interface", allowedRoles: ["FRONTEND", "BACKEND", "ADMIN"], techStack: ["React", "Node.js"] },
      { name: "Infrastructure", description: "DevOps and server configs", allowedRoles: ["DEVOPS", "ADMIN"], techStack: ["Docker", "Nginx", "Linux"] },
    ];

    for (const p of projects) {
      const exists = await db.collection('projects').findOne({ name: p.name });
      if (!exists) {
        console.log(`Creating project: ${p.name}`);
        const result = await db.collection('projects').insertOne({
          ...p,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Seed some categories for each project
        const categoriesResult = await db.collection('categories').insertMany([
          { name: "Architecture", projectId: result.insertedId, allowedRoles: p.allowedRoles, order: 1, createdAt: new Date(), updatedAt: new Date() },
          { name: "API Reference", projectId: result.insertedId, allowedRoles: p.allowedRoles, order: 2, createdAt: new Date(), updatedAt: new Date() },
        ]);

        // Seed a sample document in the first category
        if (p.name === "Sahiy.uz") {
          await db.collection('documents').insertOne({
            title: "Frontend Standards",
            content: "# Frontend Standards\n\n- [ ] Use Next.js 14+\n- [ ] Use Tailwind CSS\n- [ ] Atomic Design Pattern",
            categoryId: Object.values(categoriesResult.insertedIds)[0],
            status: "REVIEWED",
            allowedRoles: p.allowedRoles,
            owner: user?._id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        if (p.name === "Seller Panel") {
          await db.collection('documents').insertOne({
            title: "Getting Started",
            content: "# Seller Panel: Getting Started\n\n1. Clone repo\n2. npm install\n3. npm run dev",
            categoryId: Object.values(categoriesResult.insertedIds)[0],
            status: "DRAFT",
            allowedRoles: p.allowedRoles,
            owner: user?._id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        if (p.name === "Infrastructure") {
          await db.collection('documents').insertOne({
            title: "Architecture Overview",
            content: "# Infrastructure Architecture\n\n- Nginx Ingress\n- Docker Swarm / Kubernetes\n- MongoDB Cluster",
            categoryId: Object.values(categoriesResult.insertedIds)[0],
            status: "REVIEWED",
            allowedRoles: p.allowedRoles,
            owner: user?._id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

test();
