const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db('sahiy_docs');
    const projectId = new ObjectId('69fc2164078dd485b0c79de5');

    // 1. Update Project Roles
    await db.collection('projects').updateOne(
      { _id: projectId }, 
      { $addToSet: { allowedRoles: 'MOBILE' } }
    );

    // 2. Create Category
    const catResult = await db.collection('categories').insertOne({ 
      name: 'Asosiy', 
      projectId: projectId, 
      allowedRoles: ['MOBILE', 'ADMIN', 'SUPER_ADMIN'], 
      order: 1, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    });
    const catId = catResult.insertedId;

    // 3. Create Documents
    await db.collection('documents').insertMany([
      { 
        title: 'Sahiy Mobile Kirish', 
        content: '# Sahiy Mobile\n\nBu mobile ilova uchun asosiy dokumentatsiya.', 
        categoryId: catId, 
        status: 'REVIEWED', 
        allowedRoles: ['MOBILE', 'ADMIN', 'SUPER_ADMIN'], 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        title: 'Auth Tizimi', 
        content: '# Auth Tizimi\n\nFirebase Auth orqali tizimga kirish bosqichlari.', 
        categoryId: catId, 
        status: 'REVIEWED', 
        allowedRoles: ['MOBILE', 'ADMIN', 'SUPER_ADMIN'], 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        title: 'Deep Linking Sozlamalari', 
        content: '# Deep Linking\n\nIlova ichida deep linklarni sozlash bo\'yicha qo\'llanma.', 
        categoryId: catId, 
        status: 'DRAFT', 
        allowedRoles: ['MOBILE', 'ADMIN', 'SUPER_ADMIN'], 
        createdAt: new Date(), 
        updatedAt: new Date() 
      }
    ]);

    console.log('Mobile project setup completed successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
