const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const { matchId } = event;
  
  if (!matchId) return { success: false, error: '缺少 matchId' };
  
  try {
    const { data: match } = await db.collection('matches').doc(matchId).get();
    if (!match) return { success: false, error: '场次不存在' };
    
    const regs = match.registrations || [];
    const maxPlayers = match.maxPlayers || 14;
    const needScreenshot = match.needScreenshot !== false;
    
    // 排序逻辑：场主/护法优先 > 截图优先 > 报名时间
    let sorted = [...regs];
    const ownerId = match.ownerId;
    const assistantIds = match.assistantIds || [];
    
    const getPriority = (r) => {
      if (r.playerId === ownerId) return 3; // 场主最高
      if (assistantIds.includes(r.playerId)) return 2; // 护法次高
      if (needScreenshot && r.screenshot) return 1; // 有截图
      return 0;
    };
    
    sorted.sort((a, b) => {
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pb - pa; // 优先级高的在前
      return new Date(a.registeredAt) - new Date(b.registeredAt);
    });
    
    // 更新状态：前 maxPlayers 为 confirmed，其余为 WL
    const updated = sorted.map((r, idx) => ({
      ...r,
      status: idx < maxPlayers ? 'confirmed' : 'WL'
    }));
    
    // 记录状态变化的人员
    const changedConfirmed = []; // WL -> confirmed
    const changedWL = []; // confirmed -> WL
    const changed = []; // 所有状态变化
    
    for (const u of updated) {
      const old = regs.find(r => r.playerId === u.playerId);
      if (old && old.status !== u.status) {
        changed.push(u.playerId);
        if (u.status === 'confirmed') changedConfirmed.push(u.playerId);
        else changedWL.push(u.playerId);
      }
    }
    
    await db.collection('matches').doc(matchId).update({
      data: { registrations: updated, teamConfirmed: true }
    });
    
    // 候补晋升的人员（从WL升到confirmed）
    const promoted = updated.filter((r, idx) => {
      const oldIdx = regs.findIndex(old => old.playerId === r.playerId);
      return oldIdx >= maxPlayers && idx < maxPlayers;
    });
    
    // 发送候补晋升通知
    const promotedIds = promoted.map(r => r.playerId);
    if (promotedIds.length > 0) {
      try {
        await cloud.callFunction({
          name: 'sendNotification',
          data: { type: 'promoted', matchId, playerIds: promotedIds }
        });
      } catch (e) { console.error('候补通知发送失败', e); }
    }
    
    return { success: true, promoted: promotedIds, changed, changedConfirmed, changedWL };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
