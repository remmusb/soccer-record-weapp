const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const { playerIds } = event;

  // 如果传入了 playerIds，精确查询这些球员（避免 limit 遗漏）
  if (playerIds && Array.isArray(playerIds) && playerIds.length > 0) {
    const { data } = await db.collection('players')
      .where({ _id: db.command.in(playerIds) })
      .limit(100)
      .get();
    return { players: data };
  }

  // 否则返回所有球员（最多 100 个）
  const { data } = await db.collection('players').limit(100).get();
  return { players: data };
};
