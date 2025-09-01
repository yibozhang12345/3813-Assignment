const storage = require('../utils/storage');
let groups = storage.load('groups.json');

exports.getGroups = (req, res) => {
  res.json(groups);
};

exports.createGroup = (req, res) => {
  const { name } = req.body;
  const newGroup = {
    id: Date.now().toString(),
    name,
    admins: [],
    users: [],
    channels: []
  };
  groups.push(newGroup);
  storage.save('groups.json', groups);
  res.json(newGroup);
};
