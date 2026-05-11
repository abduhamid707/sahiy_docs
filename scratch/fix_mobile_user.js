const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function run() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db('sahiy_docs');
    
    // Find Sahiy Mobile project (or create if missing)
    let project = await db.collection('projects').findOne({ name: 'Sahiy Mobile' });
    if (!project) {
        const res = await db.collection('projects').insertOne({
            name: 'Sahiy Mobile',
            description: 'Mobile Application Documentation',
            allowedRoles: ['ADMIN', 'MOBILE'],
            createdAt: new Date(),
            updatedAt: new Date()
        });
        project = { _id: res.insertedId };
    }

    const projectId = project._id;

    // 1. Ensure project has MOBILE role
    await db.collection('projects').updateOne(
      { _id: projectId }, 
      { $addToSet: { allowedRoles: 'MOBILE' } }
    );

    // 2. Create MOBILE User with the password I told the user
    const hashedPassword = await bcrypt.hash('mobile_password_2026', 10);
    const mobileUser = {
      name: 'Mobile Developer',
      email: 'mobile@gmail.com',
      password: hashedPassword,
      role: 'MOBILE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('users').updateOne(
      { email: 'mobile@gmail.com' },
      { $set: mobileUser },
      { upsert: true }
    );

    console.log('Mobile user updated with password: mobile_password_2026');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
