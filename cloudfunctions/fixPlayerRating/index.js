const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const { playerId } = event;
  
  if (!playerId) {
    return { success: false, error: '缺少 playerId 参数' };
  }

  try {
    // 1. 获取球员数据
    const { data } = await db.collection('players').doc(playerId).get();
    
    // 2. 获取所有已结束的比赛
    const { data: matches } = await db.collection('matches')
      .where({ status: 'completed' })
      .limit(100)
      .get();

    // 3. 筛选该球员实际参加的比赛
    const playerMatches = matches.filter(m => {
      const inA = (m.teamA?.players || []).includes(playerId);
      const inB = (m.teamB?.players || []).includes(playerId);
      return inA || inB;
    });

    console.log('球员ID:', playerId);
    console.log('实际参赛场次:', playerMatches.length);

    // 4. 如果没有参赛记录，清除所有评分数据，只保留初始评分
    if (playerMatches.length === 0) {
      // 获取当前 ratings 数据
      const currentRatings = data.ratings || {};
      const initialRating = (typeof currentRatings.initialRating === 'number') ? currentRatings.initialRating : 5;

      // 构建新的 ratings 对象：只保留 initialRating，清除所有评分记录
      const newRatings = {
        initialRating: initialRating,
        peerRatings: [],
        adminRatings: []
      };

      // 更新数据库
      await db.collection('players').doc(playerId).update({
        data: {
          ratings: newRatings
        }
      });

      return {
        success: true,
        message: '已清除该球员的所有评分记录',
        playerId: playerId,
        initialRating: initialRating,
        clearedPeerRatings: (currentRatings.peerRatings || []).length,
        clearedAdminRatings: (currentRatings.adminRatings || []).length
      };
    }

    // 如果有参赛记录，返回实际参赛的比赛ID列表
    return {
      success: true,
      message: '该球员有参赛记录，无需清理',
      playerId: playerId,
      matchCount: playerMatches.length,
      matchIds: playerMatches.map(m => m._id)
    };

  } catch (e) {
    console.error('修复评分失败', e);
    return { success: false, error: e.message };
  }
};