const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = "mongodb://localhost:27017/sahiy_docs";

async function fixAdmin() {
  await mongoose.connect(MONGODB_URI);
  console.log('DBga ulandi');

  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    password: String,
    role: String
  }));

  const hashedPassword = await bcrypt.hash('admin', 10);
  
  const result = await User.updateOne(
    { email: 'admin@gmail.com' },
    { $set: { password: hashedPassword } }
  );

  console.log('Yangilandi:', result);
  process.exit(0);
}

fixAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
