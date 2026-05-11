db.users.updateOne(
  { email: 'admin@gmail.com' },
  { $set: { password: '$2b$10$A12vTAYx.mN2bhLxnvjcfu259Y5P99nvgH5G/I6R1ouo9ebkAANii' } }
);
