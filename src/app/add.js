/*插入至少 3 条产品数据*/
const { MongoClient } = require('mongodb');
const url = "mongodb://localhost:27017";
const client = new MongoClient(url);

async function run() {
  try {
    await client.connect();
    const db = client.db("mydb");
    const products = db.collection("products");
    await products.deleteMany({});
    await products.insertMany([
      { id: 1, name: "Laptop", description: "Fast computer", price: 1200.50, units: 5 },
      { id: 2, name: "Phone", description: "Smartphone", price: 799.99, units: 10 },
      { id: 3, name: "Headset", description: "Noise cancelling", price: 199.95, units: 8 }
    ]);
    console.log("✅ Products added");
  } finally {
    await client.close();
  }
}
run();
