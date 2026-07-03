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
  const { matchId, updateData } = event;
  
  if (!matchId || !updateData) {
    return { success: false, error: '缺少参数' };
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
