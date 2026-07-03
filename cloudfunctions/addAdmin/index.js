const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const { playerId } = event;
  
  if (!playerId) return { success: false, error: '缺少 playerId' };
  
  // 检查是否已是管理员
  const existing = await db.collection('admins').where({ playerId }).get();
  if (existing.data.length > 0) {
    return { success: false, error: '该球员已是管理员' };
  }
  
  // 检查数量限制
  const all = await db.collection('admins').get();
  if (all.data.length >= 10) {
    return { success: false, error: '管理员最多10人' };
  }
  
  await db.collection('admins').add({
    data: { playerId, createdAt: db.serverDate() }
  });
  
  return { success: true };
};
