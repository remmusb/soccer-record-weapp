const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { playerId } = event;
  if (!playerId) return { success: false, error: '缺少 playerId' };

  try {
    // 1. 获取场主比赛
    const { data: ownerMatches } = await db.collection('matches')
      .where({ ownerId: playerId })
      .orderBy('date', 'desc')
      .get();

    // 2. 获取护法比赛（assistantIds 数组包含 playerId）
    const { data: allMatches } = await db.collection('matches')
      .where({ assistantIds: _.exists(true) })
      .orderBy('date', 'desc')
      .get();
    const assistantMatches = allMatches.filter(m => 
      (m.assistantIds || []).includes(playerId)
    );

    return { 
      success: true, 
      ownerMatches, 
      assistantMatches 
    };
  } catch (e) {
    console.error('获取球员比赛失败', e);
    return { success: false, error: e.message };
  }
};
