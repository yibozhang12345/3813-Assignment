// remove.js删除一个产品
const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

async function run() {
  const id = Number(process.argv[2]);
  if (isNaN(id)) {
    console.error('Usage: node remove.js <id>');
    process.exit(1);
  }

  try {
    await client.connect();
    const db = client.db('mydb');
    const products = db.collection('products');

    const res = await products.deleteOne({ id });
    if (res.deletedCount === 0) {
      console.log(`No product found with id=${id}`);
    } else {
      console.log(`Deleted product with id=${id}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
