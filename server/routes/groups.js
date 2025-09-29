const express = require('express');
const router = express.Router();
const getDb = require('../db/mongoClient');
const { ObjectId } = require('mongodb');

router.post('/groups', async (req, res) => {
  const db = await getDb();
  const groups = db.collection('groups');

  const { name, adminId } = req.body;
  const result = await groups.insertOne({
    name,
    admins: [adminId],
    channels: []
  });

  res.json({ message: 'Group created', groupId: result.insertedId });
});

router.post('/groups/:groupId/channels', async (req, res) => {
  const db = await getDb();
  const groups = db.collection('groups');
  const { name } = req.body;
  const groupId = req.params.groupId;

  const newChannel = {
    _id: new Date().getTime().toString(),
    name
  };

  await groups.updateOne(
    { _id: new ObjectId(groupId) },
    { $push: { channels: newChannel } }
  );

  res.json({ message: 'Channel added', channel: newChannel });
});

module.exports = router;
