const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const _ = db.command;
  const { playerIds } = event;
  
  if (!playerIds || playerIds.length === 0) {
    return { players: [] };
  }
  
  try {
    const { data } = await db.collection('players')
      .where({ _id: _.in(playerIds) })
      .get();
    return { players: data };
  } catch (e) {
    console.error('查询球员失败', e);
    return { players: [], error: e.message };
  }
};