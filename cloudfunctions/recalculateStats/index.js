const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 前场位置
const FRONT_POSITIONS = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'];
// 后场位置
const BACK_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM'];

function isFrontline(player) {
  if (!player.positions || player.positions.length === 0) return false;
  return player.positions.some(p => FRONT_POSITIONS.includes(p));
}

function isBackline(player) {
  if (!player.positions || player.positions.length === 0) return false;
  return player.positions.some(p => BACK_POSITIONS.includes(p));
}

exports.main = async (event, context) => {
  try {
    const { data: players } = await db.collection('players').get();
    const { data: matches } = await db.collection('matches').where({ status: 'completed' }).get();
    
    // 收集所有有效的 completed 比赛 matchId，用于过滤评分
    const validMatchIds = new Set(matches.map(m => m._id));
    
    const statsMap = {};
    players.forEach(p => {
      statsMap[p._id] = {
        appearances: 0, goals: 0, assists: 0, wins: 0, draws: 0, losses: 0,
        yellowCards: 0, redCards: 0, ownGoals: 0, mvp: 0
      };
    });

    // 获取所有球员的评分数据，用于MVP计算
    const playerRatingsMap = {};
    for (const p of players) {
      const playerDoc = await db.collection('players').doc(p._id).get();
      const ratings = (playerDoc.data || {}).ratings || {};
      playerRatingsMap[p._id] = {
        peerRatings: (ratings.peerRatings || []).filter(r => validMatchIds.has(r.matchId)),
        adminRatings: (ratings.adminRatings || []).filter(r => validMatchIds.has(r.matchId)),
        initialRating: ratings.initialRating || 5
      };
    }

    for (const m of matches) {
      if (m.ownerId && statsMap[m.ownerId]) statsMap[m.ownerId].ownerCount++;
      const assistantIds = m.assistantIds || [];
      assistantIds.forEach(id => {
        if (id && statsMap[id]) statsMap[id].assistantCount++;
      });

      const confirmed = (m.registrations || []).filter(r => r.status === 'confirmed' && !r.isTempPlayer);
      const registeredIds = confirmed.map(r => r.playerId);
      const aWin = ((m.teamA || {}).score || 0) > ((m.teamB || {}).score || 0);
      const bWin = ((m.teamB || {}).score || 0) > ((m.teamA || {}).score || 0);
      const draw = ((m.teamA || {}).score || 0) === ((m.teamB || {}).score || 0);

      // 收集该场比赛每个球员的评分和进球+助攻数
      const matchPlayerStats = {};
      
      for (const pid of registeredIds) {
        if (!statsMap[pid]) continue;
        statsMap[pid].appearances++;
        const inA = ((m.teamA || {}).players || []).includes(pid);
        const inB = ((m.teamB || {}).players || []).includes(pid);
        if (inA) {
          if (aWin) statsMap[pid].wins++;
          else if (draw) statsMap[pid].draws++;
          else statsMap[pid].losses++;
        } else if (inB) {
          if (bWin) statsMap[pid].wins++;
          else if (draw) statsMap[pid].draws++;
          else statsMap[pid].losses++;
        }
        
        // 初始化该球员的比赛数据
        matchPlayerStats[pid] = { score: 0, goals: 0, assists: 0 };
        
        // 计算该球员在该场比赛的评分
        const pr = playerRatingsMap[pid];
        if (pr) {
          const peerAvg = pr.peerRatings.length > 0 
            ? pr.peerRatings.filter(r => r.matchId === m._id).reduce((s, r) => s + r.score, 0) / 
              Math.max(pr.peerRatings.filter(r => r.matchId === m._id).length, 1)
            : pr.initialRating;
          const adminAvg = pr.adminRatings.length > 0 
            ? pr.adminRatings.filter(r => r.matchId === m._id).reduce((s, r) => s + r.score, 0) / 
              Math.max(pr.adminRatings.filter(r => r.matchId === m._id).length, 1)
            : pr.initialRating;
          matchPlayerStats[pid].score = peerAvg * 0.5 + adminAvg * 0.3 + 5 * 0.2; // 简化计算
        }
      }

      for (const e of (m.events || [])) {
        if (!statsMap[e.playerId]) continue;
        if (e.type === 'goal') { statsMap[e.playerId].goals++; matchPlayerStats[e.playerId].goals++; }
        if (e.type === 'assist') { statsMap[e.playerId].assists++; matchPlayerStats[e.playerId].assists++; }
        if (e.type === 'yellow') statsMap[e.playerId].yellowCards++;
        if (e.type === 'red') statsMap[e.playerId].redCards++;
        if (e.type === 'own_goal') statsMap[e.playerId].ownGoals++;
        if (e.type === 'penalty') { statsMap[e.playerId].goals++; matchPlayerStats[e.playerId].goals++; }
      }
      
      // 计算该场比赛的 MVP
      const mvpIds = calculateMVP(matchPlayerStats);
      if (mvpIds.length > 0) {
        // 更新比赛的 MVP 字段
        await db.collection('matches').doc(m._id).update({
          data: { mvp: mvpIds }
        });
        // 累计每个 MVP 球员的 MVP 次数
        for (const mvpId of mvpIds) {
          if (statsMap[mvpId]) statsMap[mvpId].mvp++;
        }
      }
    }

    const results = [];

    // 计算比赛表现分 (performanceRating) - 20% 权重
    for (const p of players) {
      const s = statsMap[p._id];
      const total = s.appearances || 1;
      const winRate = (s.wins * 3 + s.draws) / (total * 3);
      const goalRate = Math.min(s.goals / total, 2);
      const assistRate = Math.min(s.assists / total, 2);
      const cardPenalty = (s.redCards * 1 + s.yellowCards * 0.3) / total;
      
      let performanceRating = 5;
      if (isFrontline(p)) {
        performanceRating = 5 + winRate * 2 + goalRate * 1.5 + assistRate * 1 - cardPenalty;
      } else if (isBackline(p)) {
        performanceRating = 5 + winRate * 3 - cardPenalty * 0.5;
      } else {
        performanceRating = 5 + winRate * 2 + goalRate * 1 + assistRate * 0.5 - cardPenalty;
      }
      performanceRating = Math.min(10, Math.max(1, Math.round(performanceRating * 10) / 10));
      
      // 获取评分记录，只保留对应有效 completed 比赛的评分
      const playerDoc = await db.collection('players').doc(p._id).get();
      const ratings = (playerDoc.data || {}).ratings || {};
      
      const peerRatings = (ratings.peerRatings || []).filter(r => validMatchIds.has(r.matchId));
      const adminRatings = (ratings.adminRatings || []).filter(r => validMatchIds.has(r.matchId));
      const initialRating = ratings.initialRating || 5;
      
      // 计算平均分（仅基于有效比赛的评分）
      const peerAvg = peerRatings.length > 0 
        ? peerRatings.reduce((s, r) => s + r.score, 0) / peerRatings.length 
        : initialRating;
      const adminAvg = adminRatings.length > 0 
        ? adminRatings.reduce((s, r) => s + r.score, 0) / adminRatings.length 
        : initialRating;
      
      // 综合评分 = 队友互评50% + 管理员30% + 比赛表现20%
      let compositeRating = peerAvg * 0.5 + adminAvg * 0.3 + performanceRating * 0.2;
      compositeRating = Math.min(10, Math.max(1, Math.round(compositeRating * 10) / 10));
      
      s.rating = compositeRating;
      s.performanceRating = performanceRating;
      s.peerAvg = peerAvg;
      s.adminAvg = adminAvg;

      results.push({
        playerId: p._id,
        nickname: p.nickname,
        initialRating,
        peerAvg,
        adminAvg,
        performanceRating,
        compositeRating,
        appearances: s.appearances,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goals: s.goals,
        assists: s.assists,
        mvp: s.mvp
      });

      await db.collection('players').doc(p._id).update({
        data: { 
          stats: {
            appearances: s.appearances,
            goals: s.goals,
            assists: s.assists,
            wins: s.wins,
            draws: s.draws,
            losses: s.losses,
            yellowCards: s.yellowCards,
            redCards: s.redCards,
            ownGoals: s.ownGoals,
            rating: compositeRating,
            performanceRating: performanceRating,
            ownerCount: s.ownerCount,
            assistantCount: s.assistantCount,
            adminAvg: s.adminAvg,
            peerAvg: s.peerAvg,
            mvp: s.mvp
          }
        }
      });
    }

    return { success: true, updated: players.length, results };
  } catch (e) {
    console.error(e);
    return { success: false, error: e.message };
  }
};

// 计算单场比赛 MVP
function calculateMVP(matchPlayerStats) {
  const entries = Object.entries(matchPlayerStats);
  if (entries.length === 0) return [];
  
  // 1. 按评分排序
  entries.sort((a, b) => b[1].score - a[1].score);
  const highestScore = entries[0][1].score;
  const topByScore = entries.filter(e => e[1].score === highestScore);
  
  // 2. 如果评分相同，比较进球+助攻
  if (topByScore.length > 1) {
    topByScore.sort((a, b) => (b[1].goals + b[1].assists) - (a[1].goals + a[1].assists));
    const highestGA = topByScore[0][1].goals + topByScore[0][1].assists;
    const topByGA = topByScore.filter(e => (e[1].goals + e[1].assists) === highestGA);
    
    // 3. 如果还不能唯一，则都为 MVP
    return topByGA.map(e => e[0]);
  }
  
  return [topByScore[0][0]];
}
