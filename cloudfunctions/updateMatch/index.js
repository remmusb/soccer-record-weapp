const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 内容安全检查辅助函数
async function checkText(content, openid) {
  if (!content || !content.trim()) return { safe: true };
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content,
      version: 2,
      scene: 1,
      openid: openid || ''
    });
    if (res.errCode === 87014) return { safe: false, error: '内容含有违规信息' };
    return { safe: true };
  } catch (e) {
    console.error('[securityCheck] API调用失败:', e);
    return { safe: true };
  }
}

exports.main = async (event, context) => {
  const db = cloud.database();
  const { OPENID } = cloud.getWXContext();
  const { matchId, updateData, action } = event;
  
  if (!matchId) {
    return { success: false, error: '缺少 matchId' };
  }
  
  // 1. 获取比赛数据（无需管理员权限，用于编辑页面加载）
  if (action === 'get') {
    try {
      const { data } = await db.collection('matches').doc(matchId).get();
      if (!data) return { success: false, error: '场次不存在' };
      return { success: true, match: data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  if (!updateData) {
    return { success: false, error: '缺少 updateData' };
  }
  
  // 检查管理员权限
  let isAdmin = false;
  if (OPENID) {
    const player = await db.collection('players').where({ _openid: OPENID }).get();
    if (player.data.length > 0) {
      const admin = await db.collection('admins').where({ playerId: player.data[0]._id }).get();
      isAdmin = admin.data.length > 0;
    }
  }
  if (!isAdmin) {
    return { success: false, error: '无权限' };
  }
  
  // 内容安全检查
  const textFields = ['title', 'location', 'notes', 'teamA.name', 'teamB.name'];
  for (const field of textFields) {
    const value = updateData[field] || updateData[field.replace('.', '_')];
    if (value && typeof value === 'string') {
      const checkResult = await checkText(value, OPENID);
      if (!checkResult.safe) {
        return { success: false, error: `${field}：${checkResult.error}` };
      }
    }
  }
  
  try {
    await db.collection('matches').doc(matchId).update({ data: updateData });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
