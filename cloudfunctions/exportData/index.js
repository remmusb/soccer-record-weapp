const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const [players, matches] = await Promise.all([
    db.collection('players').get(),
    db.collection('matches').get()
  ]);
  return { players: players.data, matches: matches.data };
};
