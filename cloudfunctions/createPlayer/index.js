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
    return { safe: true }; // API 失败时不阻塞
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const { name, nickname, positions, initialRating, birthDate, avatar, allowRating, kttLast4, height, weight, foot, preferredPosition, hideBirthDate, hideHeight, hideWeight, hideFoot } = event;

  if (!nickname || !nickname.trim()) {
    return { success: false, error: '昵称必填' };
  }

  // 内容安全检查
  const checkResult = await checkText(nickname.trim(), OPENID);
  if (!checkResult.safe) {
    return { success: false, error: checkResult.error };
  }
  if (name && name.trim()) {
    const nameCheck = await checkText(name.trim(), OPENID);
    if (!nameCheck.safe) {
      return { success: false, error: nameCheck.error };
    }
  }

  const ir = initialRating || 5;
  const compositeRating = Math.min(10, Math.max(1, Math.round((ir * 0.8 + 1) * 10) / 10));
  const allowRatingVal = allowRating !== false; // 默认允许评分

  try {
    const res = await db.collection('players').add({
      data: {
        _openid: OPENID, // 保存用户的 openid
        name: (name || '').trim(),
        nickname: nickname.trim(),
        kttLast4: kttLast4 || '',
        birthDate: birthDate || '',
        height: height || '',
        weight: weight || '',
        foot: foot || '',
        preferredPosition: preferredPosition || '',
        positions: positions || [],
        hideBirthDate: hideBirthDate || false,
        hideHeight: hideHeight || false,
        hideWeight: hideWeight || false,
        hideFoot: hideFoot || false,
        avatar: avatar || '',
        allowRating: allowRatingVal,
        ratings: {
          initialRating: ir,
          peerRatings: [],
          adminRatings: []
        },
        stats: {
          appearances: 0, goals: 0, assists: 0, wins: 0, draws: 0, losses: 0,
          yellowCards: 0, redCards: 0, ownGoals: 0, rating: compositeRating,
          ownerCount: 0, assistantCount: 0,
          adminAvg: ir,
          peerAvg: ir,
          performanceRating: 5
        },
        createdAt: db.serverDate()
      }
    });
    return { success: true, id: res._id };
  } catch (e) {
    return { success: false, error: e.message || '创建失败' };
  }
};
