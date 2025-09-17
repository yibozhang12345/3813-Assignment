// update.js按自定义 id 更新一个产品
const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

/** 解析命令行参数为要更新的字段 */
function parseArgs(argv) {
  // 期望：node update.js <id> key=value key=value ...
  const set = {};
  for (let i = 3; i < argv.length; i++) {
    const [k, ...rest] = argv[i].split('=');
    if (!k || rest.length === 0) continue;
    let v = rest.join('=');

    // 尝试把数字字符串转数字
    if (!isNaN(v) && v.trim() !== '') v = Number(v);

    set[k] = v;
  }
  return set;
}

async function run() {
  const argv = process.argv;
  const id = Number(argv[2]);
  if (isNaN(id)) {
    console.error('Usage: node update.js <id> key=value [key=value ...]');
    process.exit(1);
  }
  const updates = parseArgs(argv);
  if (!Object.keys(updates).length) {
    console.error('No fields to update. Provide key=value pairs.');
    process.exit(1);
  }

  try {
    await client.connect();
    const db = client.db('mydb');
    const products = db.collection('products');

    const res = await products.updateOne({ id }, { $set: updates });
    if (res.matchedCount === 0) {
      console.log(`No product found with id=${id}`);
    } else {
      console.log(`Updated product id=${id}. Modified: ${res.modifiedCount}`);
      const doc = await products.findOne({ id });
      console.log('New document:', JSON.stringify(doc, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
