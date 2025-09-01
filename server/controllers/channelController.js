const storage = require('../utils/storage');
let channels = storage.load('channels.json');

exports.getChannels = (req, res) => {
  const { groupId } = req.params;
  const groupChannels = channels.filter(c => c.groupId === groupId);
  res.json(groupChannels);
};

exports.createChannel = (req, res) => {
  const { groupId } = req.params;
  const { name } = req.body;
  const newChannel = {
    id: Date.now().toString(),
    name,
    groupId,
    users: []
  };
  channels.push(newChannel);
  storage.save('channels.json', channels);
  res.json(newChannel);
};
