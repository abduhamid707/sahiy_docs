const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function run() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db('sahiy_docs');
    const projectId = new ObjectId('69fb25beffd3e7a149d7f9f6');

    // 1. Update Project
    await db.collection('projects').updateOne(
      { _id: projectId }, 
      { $addToSet: { allowedRoles: 'MOBILE' } }
    );

    // 2. Update Categories
    await db.collection('categories').updateMany(
      { projectId: projectId }, 
      { $addToSet: { allowedRoles: 'MOBILE' } }
    );

    // 3. Update Documents
    const categories = await db.collection('categories').find({ projectId: projectId }).toArray();
    const catIds = categories.map(c => c._id);
    await db.collection('documents').updateMany(
      { categoryId: { $in: catIds } }, 
      { $addToSet: { allowedRoles: 'MOBILE' } }
    );

    // 4. Create MOBILE User
    const hashedPassword = await bcrypt.hash('password123', 10);
    const mobileUser = {
      name: 'MOBILE User',
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

    console.log('MOBILE role and user created successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
