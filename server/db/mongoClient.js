const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const dbName = 'chatApp';

async function getDb() {
  if (!client.topology?.isConnected()) await client.connect();
  return client.db(dbName);
}

module.exports = getDb;
