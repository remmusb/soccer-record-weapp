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
    // 分页获取所有球员（默认限制100条）
    let players = [];
    let skip = 0;
    const LIMIT = 100;
    while (true) {
      const { data } = await db.collection('players').limit(LIMIT).skip(skip).get();
      if (data.length === 0) break;
      players = players.concat(data);
      if (data.length < LIMIT) break;
      skip += LIMIT;
    }
    
    // 分页获取所有比赛（默认限制100条）
    let allMatches = [];
    skip = 0;
    while (true) {
      const { data } = await db.collection('matches').limit(LIMIT).skip(skip).get();
      if (data.length === 0) break;
      allMatches = allMatches.concat(data);
      if (data.length < LIMIT) break;
      skip += LIMIT;
    }
    
    const completedMatches = allMatches.filter(m => m.status === 'completed');
    
    // 收集所有有效的 completed 比赛 matchId，用于过滤评分
    const validMatchIds = new Set(completedMatches.map(m => m._id));
    
    
    const statsMap = {};
    players.forEach(p => {
      statsMap[p._id] = {
        appearances: 0, goals: 0, assists: 0, wins: 0, draws: 0, losses: 0,
        yellowCards: 0, redCards: 0, ownGoals: 0, mvp: 0,
        ownerCount: 0, assistantCount: 0
      };
    });

    // 构建球员评分映射，直接使用已获取的 players 数据，避免 N 次 doc().get()
    const playerRatingsMap = {};
    for (const p of players) {
      const ratings = p.ratings || {};
      playerRatingsMap[p._id] = {
        peerRatings: (ratings.peerRatings || []).filter(r => validMatchIds.has(r.matchId)),
        adminRatings: (ratings.adminRatings || []).filter(r => validMatchIds.has(r.matchId)),
        initialRating: (typeof ratings.initialRating === 'number') ? ratings.initialRating : 5
      };
    }

    for (const m of allMatches) {
      if (m.ownerId && statsMap[m.ownerId]) statsMap[m.ownerId].ownerCount++;
      const assistantIds = m.assistantIds || [];
      assistantIds.forEach(id => {
        if (id && statsMap[id]) statsMap[id].assistantCount++;
      });

      // 只有已结束的比赛才统计比赛数据（出场、进球、胜负、MVP等）
      if (m.status !== 'completed') continue;

      // 出场以分队名单为准，排除临时球员，确保pid是字符串
      const teamAPlayers = ((m.teamA || {}).players || []).filter(pid => typeof pid === 'string' && !pid.startsWith('temp_'));
      const teamBPlayers = ((m.teamB || {}).players || []).filter(pid => typeof pid === 'string' && !pid.startsWith('temp_'));
      const registeredIds = [...new Set([...teamAPlayers, ...teamBPlayers])];
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
        // 确保 playerId 是有效字符串
        const evtPid = e.playerId;
        if (!evtPid || typeof evtPid !== 'string') continue;
        if (!statsMap[evtPid]) continue;
        // 确保 matchPlayerStats 中有该球员的条目（即使不在分队名单中）
        if (!matchPlayerStats[evtPid]) {
          matchPlayerStats[evtPid] = { score: 5, goals: 0, assists: 0 };
        }
        if (e.type === 'goal') { statsMap[evtPid].goals++; matchPlayerStats[evtPid].goals++; }
        if (e.type === 'assist') { statsMap[evtPid].assists++; matchPlayerStats[evtPid].assists++; }
        if (e.type === 'yellow') statsMap[evtPid].yellowCards++;
        if (e.type === 'red') statsMap[evtPid].redCards++;
        if (e.type === 'own_goal') statsMap[evtPid].ownGoals++;
        if (e.type === 'penalty') { statsMap[evtPid].goals++; matchPlayerStats[evtPid].goals++; }
      }
      
      // 计算该场比赛的 MVP
      const mvpIds = calculateMVP(matchPlayerStats);
      // 累计每个 MVP 球员的 MVP 次数
      for (const mvpId of mvpIds) {
        if (statsMap[mvpId]) statsMap[mvpId].mvp++;
      }
    }

    const results = [];

    // 计算比赛表现分 (performanceRating) - 20% 权重
    const updatePromises = [];
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
      
      // 直接使用 playerRatingsMap，避免重复 doc().get()
      const pr = playerRatingsMap[p._id] || { initialRating: 5, peerRatings: [], adminRatings: [] };
      const peerAvg = pr.peerRatings.length > 0 
        ? pr.peerRatings.reduce((s, r) => s + r.score, 0) / pr.peerRatings.length 
        : pr.initialRating;
      const adminAvg = pr.adminRatings.length > 0 
        ? pr.adminRatings.reduce((s, r) => s + r.score, 0) / pr.adminRatings.length 
        : pr.initialRating;
      
      // 综合评分 = 队友互评50% + 管理员30% + 比赛表现20%
      let compositeRating = peerAvg * 0.5 + adminAvg * 0.3 + performanceRating * 0.2;
      compositeRating = Math.min(10, Math.max(1, Math.round(compositeRating * 10) / 10));
      
      s.rating = compositeRating;
      s.performanceRating = performanceRating;
      s.peerAvg = peerAvg;
      s.adminAvg = adminAvg;

      const resultItem = {
        playerId: p._id,
        nickname: p.nickname || '未知',
        initialRating: pr.initialRating,
        peerAvg: peerAvg,
        adminAvg: adminAvg,
        performanceRating: performanceRating,
        compositeRating: compositeRating,
        appearances: s.appearances,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goals: s.goals,
        assists: s.assists,
        mvp: s.mvp
      };
      results.push(resultItem);

      updatePromises.push(db.collection('players').doc(p._id).update({
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
      }));
    }
    await Promise.all(updatePromises);

    return { success: true, updated: players.length, results };
  } catch (e) {
    console.error('recalculateStats 错误:', e);
    console.error('错误堆栈:', e.stack);
    return { success: false, error: e.message, stack: e.stack };
  }
};

// 计算单场比赛 MVP
function calculateMVP(matchPlayerStats) {
  const entries = Object.entries(matchPlayerStats).filter(e => e[1] && typeof e[1] === 'object');
  if (entries.length === 0) return [];
  
  // 1. 按评分排序
  entries.sort((a, b) => (b[1]?.score || 0) - (a[1]?.score || 0));
  const highestScore = entries[0][1]?.score || 0;
  const topByScore = entries.filter(e => (e[1]?.score || 0) === highestScore);
  
  // 2. 如果评分相同，比较进球+助攻
  if (topByScore.length > 1) {
    topByScore.sort((a, b) => ((b[1]?.goals || 0) + (b[1]?.assists || 0)) - ((a[1]?.goals || 0) + (a[1]?.assists || 0)));
    const highestGA = (topByScore[0][1]?.goals || 0) + (topByScore[0][1]?.assists || 0);
    const topByGA = topByScore.filter(e => ((e[1]?.goals || 0) + (e[1]?.assists || 0)) === highestGA);
    
    // 3. 如果还不能唯一，则都为 MVP
    return topByGA.map(e => e[0]);
  }
  
  return [topByScore[0][0]];
}
