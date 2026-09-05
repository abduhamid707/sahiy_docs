
const mongoose = require('mongoose');
require('dotenv').config({path: '.env.local'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Call = mongoose.connection.db.collection('calls');
  let startD = new Date(); startD.setHours(0,0,0,0);
  let endD = new Date();
  
  const c = await Call.countDocuments({ startedAt: { $gte: startD, $lte: endD } });
  console.log('Calls between', startD.toISOString(), 'and', endD.toISOString(), ':', c);
  
  let startProd = new Date(); startProd.setUTCHours(0,0,0,0);
  let endProd = new Date();
  const cProd = await Call.countDocuments({ startedAt: { $gte: startProd, $lte: endProd } });
  console.log('Prod UTC between', startProd.toISOString(), 'and', endProd.toISOString(), ':', cProd);
  
  const allCount = await Call.countDocuments();
  console.log('Total calls in DB:', allCount);
  process.exit(0);
});

