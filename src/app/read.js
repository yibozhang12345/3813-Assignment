// read.js 查询并打印所有产品
const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

async function run() {
  try {
    await client.connect();
    const db = client.db('mydb');
    const products = db.collection('products');

    const list = await products.find({}).sort({ id: 1 }).toArray();
    if (!list.length) {
      console.log('No products found.');
    } else {
      console.log('Products:');
      list.forEach(p => console.log(JSON.stringify(p, null, 2)));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
