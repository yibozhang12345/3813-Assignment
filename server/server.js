const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const url = "mongodb://localhost:27017";
const client = new MongoClient(url);
let products;

async function connectDB() {
  await client.connect();
  const db = client.db("mydb");
  products = db.collection("products");
  console.log("✅ Mongo connected");
}
connectDB();

// 获取所有产品
app.get('/api/products', async (req, res) => {
  const all = await products.find({}).toArray();
  res.json(all);
});

// 添加产品（检查 id 重复）
app.post('/api/add', async (req, res) => {
  const prod = req.body;
  const exists = await products.findOne({ id: prod.id });
  if (exists) return res.status(400).json({ error: "Duplicate ID" });
  await products.insertOne(prod);
  res.json({ success: true });
});

// 更新产品
// 例：PUT /api/update/:id
app.put('/api/update/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id param' });

    const { _id, ...rest } = req.body || {}; // 移除 _id，防止 immutable 报错
    const filter = { _id: new ObjectId(id) };
    const update = { $set: rest };

    const r = await products.updateOne(filter, update);
    if (r.matchedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ ok: true, matched: r.matchedCount, modified: r.modifiedCount });
  } catch (err) {
    console.error('PUT /api/update/:id error:', err);
    res.status(500).json({ error: 'Update failed', detail: err.message });
  }
});


// 删除产品
app.delete('/api/delete/:id', async (req, res) => {
  const { id } = req.params;
  await products.deleteOne({ _id: new ObjectId(id) });
  res.json({ success: true });
});

app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));
