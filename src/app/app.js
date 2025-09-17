const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

async function main() {
  try {
    await client.connect();
    console.log("✅ Connected successfully to MongoDB");
    const db = client.db("mydb");
    const products = db.collection("products");
    // 后续 CRUD 操作放这里
  } catch (err) {
    console.error(err);
  }
}
main();
