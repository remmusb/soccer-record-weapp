const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { playerId } = event;
  const { OPENID } = cloud.getWXContext();

  if (!playerId) return { success: false, error: '缺少 playerId' };

  try {
    // 1. 检查调用者是否为管理员（通过 playerId 关联，和 login 逻辑一致）
    const player = await db.collection('players').where({ _openid: OPENID }).get();
    const myPlayerId = player.data.length > 0 ? player.data[0]._id : null;
    
    if (!myPlayerId) {
      return { success: false, error: '无权限：请先创建球员资料' };
    }
    
    const admin = await db.collection('admins').where({ playerId: myPlayerId }).get();
    if (admin.data.length === 0) {
      return { success: false, error: '无权限：仅管理员可删除球员' };
    }

    // 2. 删除球员
    await db.collection('players').doc(playerId).remove();

    return { success: true };
  } catch (e) {
    console.error('删除球员失败', e);
    return { success: false, error: e.message || '删除失败' };
  }
};
