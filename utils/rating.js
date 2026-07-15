// 共享评分计算工具函数
// 确保 list.vue 和 detail.vue 使用完全相同的计算逻辑

const FRONT_POSITIONS = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'];
const BACK_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM'];

/**
 * 计算球员评分
 * @param {Object} player - 球员对象
 * @param {Array} completedMatches - 已结束比赛数组
 * @returns {Object} 评分结果
 */
function calculatePlayerRating(player, completedMatches) {
  const playerId = player._id;
  
  // 1. 计算比赛表现分
  let winPoints = 0, teamMatches = 0, yellowCount = 0, redCount = 0;
  let goals = 0, assists = 0;

  for (const m of completedMatches) {
    const inTeamA = (m.teamA?.players || []).includes(playerId);
    const inTeamB = (m.teamB?.players || []).includes(playerId);
    if (!inTeamA && !inTeamB) continue;

    teamMatches++;
    const aScore = m.teamA?.score || 0;
    const bScore = m.teamB?.score || 0;
    if (inTeamA) {
      if (aScore > bScore) winPoints += 3;
      else if (aScore === bScore) winPoints += 1;
    } else {
      if (bScore > aScore) winPoints += 3;
      else if (bScore === aScore) winPoints += 1;
    }

    for (const e of (m.events || [])) {
      if (e.playerId === playerId) {
        if (e.type === 'goal') goals++;
        if (e.type === 'yellow') yellowCount++;
        if (e.type === 'red') redCount++;
      }
      if (e.type === 'goal' && e.assistById === playerId) {
        assists++;
      }
    }
  }

  // 表现分计算
  const isFront = player.positions?.some(pos => FRONT_POSITIONS.includes(pos));
  const isBack = player.positions?.some(pos => BACK_POSITIONS.includes(pos));

  let performanceRating = 5;
  if (teamMatches > 0) {
    const winRate = winPoints / (teamMatches * 3);
    const goalRate = Math.min(goals / teamMatches, 2);
    const assistRate = Math.min(assists / teamMatches, 2);
    const cardPenalty = (redCount * 1 + yellowCount * 0.3) / teamMatches;

    if (isFront) {
      performanceRating = 5 + winRate * 2 + goalRate * 1.5 + assistRate * 1 - cardPenalty;
    } else if (isBack) {
      performanceRating = 5 + winRate * 3 - cardPenalty * 0.5;
    } else {
      performanceRating = 5 + winRate * 2 + goalRate * 1 + assistRate * 0.5 - cardPenalty;
    }
    performanceRating = Math.min(10, Math.max(1, Math.round(performanceRating * 10) / 10));
  }

  // 2. 互评和管理员评分（只统计已结束比赛）
  const validMatchIds = new Set(completedMatches.map(m => m._id));
  const ratings = player.ratings || {};
  const peerRatings = (ratings.peerRatings || []).filter(r => validMatchIds.has(r.matchId));
  const adminRatings = (ratings.adminRatings || []).filter(r => validMatchIds.has(r.matchId));
  const initialRating = (typeof ratings.initialRating === 'number') ? ratings.initialRating : 5;

  const peerAvg = peerRatings.length > 0
    ? peerRatings.reduce((s, r) => s + r.score, 0) / peerRatings.length
    : initialRating;
  const adminAvg = adminRatings.length > 0
    ? adminRatings.reduce((s, r) => s + r.score, 0) / adminRatings.length
    : initialRating;

  // 3. 综合评分 = 互评50% + 管理员30% + 表现20%
  let compositeRating = peerAvg * 0.5 + adminAvg * 0.3 + performanceRating * 0.2;
  compositeRating = Math.min(10, Math.max(1, Math.round(compositeRating * 10) / 10));

  return {
    compositeRating,
    peerAvg,
    adminAvg,
    performanceRating,
    teamMatches,
    winPoints,
    goals,
    assists,
    yellowCount,
    redCount,
    peerCount: peerRatings.length,
    adminCount: adminRatings.length
  };
}

module.exports = { calculatePlayerRating };
