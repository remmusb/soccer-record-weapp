const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { matchId } = event;
  
  console.log(`[deleteMatch] 开始删除, matchId=${matchId}`);
  
  if (!matchId) {
    console.log('[deleteMatch] 错误: 缺少 matchId');
    return { success: false, error: '缺少 matchId' };
  }
  
  // 权限校验：仅管理员（含高级管理员，均为 admins 集合成员）可删除场次
  const { OPENID } = cloud.getWXContext();
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
  
  try {
    // 1. 获取场次信息
    console.log(`[deleteMatch] 步骤1: 获取场次信息`);
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;
    if (!match) {
      console.log('[deleteMatch] 错误: 场次不存在');
      return { success: false, error: '场次不存在' };
    }
    console.log(`[deleteMatch] 场次获取成功: ${match.title}`);
    
    // 2. 获取所有涉及的球员ID
    console.log(`[deleteMatch] 步骤2: 收集涉及球员ID`);
    const allPlayerIds = new Set();
    (match.registrations || []).forEach(r => allPlayerIds.add(r.playerId));
    if (match.ownerId) allPlayerIds.add(match.ownerId);
    (match.assistantIds || []).forEach(id => allPlayerIds.add(id));
    (match.events || []).forEach(e => {
      allPlayerIds.add(e.playerId);
      if (e.assistById) allPlayerIds.add(e.assistById);
    });
    
    const playerIds = Array.from(allPlayerIds).filter(Boolean);
    console.log(`[deleteMatch] 涉及球员数: ${playerIds.length}`);
    
    // 3. 清理所有球员的评分记录中该场比赛的评分
    if (playerIds.length > 0) {
      console.log(`[deleteMatch] 步骤3: 清理球员评分记录`);
      const { data: players } = await db.collection('players')
        .where({ _id: _.in(playerIds) })
        .get();
      
      console.log(`[deleteMatch] 查询到球员数: ${players.length}`);
      let cleanedCount = 0;
      
      for (const p of players) {
        const ratings = p.ratings || {};
        let needUpdate = false;
        
        if (ratings.peerRatings && ratings.peerRatings.length > 0) {
          const originalLen = ratings.peerRatings.length;
          ratings.peerRatings = ratings.peerRatings.filter(r => r.matchId !== matchId);
          if (ratings.peerRatings.length !== originalLen) needUpdate = true;
        }
        
        if (ratings.adminRatings && ratings.adminRatings.length > 0) {
          const originalLen = ratings.adminRatings.length;
          ratings.adminRatings = ratings.adminRatings.filter(r => r.matchId !== matchId);
          if (ratings.adminRatings.length !== originalLen) needUpdate = true;
        }
        
        if (ratings.nicknameRatings && ratings.nicknameRatings.length > 0) {
          const originalLen = ratings.nicknameRatings.length;
          ratings.nicknameRatings = ratings.nicknameRatings.filter(r => r.matchId !== matchId);
          if (ratings.nicknameRatings.length !== originalLen) needUpdate = true;
        }
        
        if (needUpdate) {
          console.log(`[deleteMatch] 清理球员 ${p._id} ${p.nickname} 的评分`);
          await db.collection('players').doc(p._id).update({
            data: { ratings }
          });
          cleanedCount++;
        }
      }
      console.log(`[deleteMatch] 清理了 ${cleanedCount} 名球员的评分`);
    }
    
    // 4. 删除比赛场次
    console.log(`[deleteMatch] 步骤4: 删除比赛场次`);
    await db.collection('matches').doc(matchId).remove();
    console.log(`[deleteMatch] 比赛场次删除成功`);
    
    // 5. 重新计算所有球员的统计数据
    console.log(`[deleteMatch] 步骤5: 重新计算统计数据`);
    try {
      await cloud.callFunction({ name: 'recalculateStats' });
      console.log(`[deleteMatch] 重新统计成功`);
    } catch (e) {
      console.error('[deleteMatch] 重新统计失败', e);
    }
    
    console.log(`[deleteMatch] 删除完成`);
    return { success: true, deleted: matchId, cleanedPlayers: playerIds.length };
  } catch (e) {
    console.error('[deleteMatch] 删除场次失败', e);
    console.error('[deleteMatch] 错误详情:', e.stack);
    return { success: false, error: e.message || '未知错误' };
  }
};
