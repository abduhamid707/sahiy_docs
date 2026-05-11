db.users.updateOne(
  { email: 'sahiy_admin@logistic.org.uz' },
  { 
    $set: { 
      name: 'Sahiy Super Admin',
      password: '$2b$10$thEdLLmAnWhqJhjQG0zSCe.vg70OtPilbC203p/mUjD8JizPQ16Zi',
      role: 'SUPER_ADMIN',
      updatedAt: new Date()
    },
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true }
);

db.users.updateOne(
  { email: 'admin@gmail.com' },
  { 
    $set: { 
      password: '$2b$10$A12vTAYx.mN2bhLxnvjcfu259Y5P99nvgH5G/I6R1ouo9ebkAANii',
      role: 'SUPER_ADMIN'
    }
  },
  { upsert: true }
);
