const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const { matchId, playerId, isLateQuit } = event;
  
  if (!matchId || !playerId) return { success: false, error: '缺少参数' };
  
  try {
    const { data: match } = await db.collection('matches').doc(matchId).get();
    if (!match) return { success: false, error: '场次不存在' };
    
    // 检查是否24小时内
    const matchDateTime = new Date(`${match.date}T${match.time}`);
    const cancelDeadline = new Date(matchDateTime.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    const isWithin24h = now > cancelDeadline;
    
    // 移除报名
    let regs = match.registrations.filter(r => r.playerId !== playerId);
    
    // 候补晋升：如果名单已确认，且有WL队员，晋升第一个WL
    let promotedId = null;
    if (match.teamConfirmed) {
      const firstWL = regs.find(r => r.status === 'WL');
      if (firstWL) {
        firstWL.status = 'confirmed';
        promotedId = firstWL.playerId;
      }
    }
    
    // 更新数据：lateQuitters 记录
    const updateData = { registrations: regs };
    if (isWithin24h && isLateQuit) {
      const lateQuitters = match.lateQuitters || [];
      const player = match.registrations.find(r => r.playerId === playerId);
      if (player && !lateQuitters.find(q => q.playerId === playerId)) {
        lateQuitters.push({
          playerId: playerId,
          nickname: player.nickname || '',
          quitAt: new Date().toISOString()
        });
      }
      updateData.lateQuitters = lateQuitters;
    }
    
    await db.collection('matches').doc(matchId).update({ data: updateData });
    
    // 发送候补晋升通知
    if (promotedId) {
      try {
        await cloud.callFunction({
          name: 'sendNotification',
          data: { type: 'promoted', matchId, playerIds: [promotedId] }
        });
      } catch (e) { console.error('候补通知发送失败', e); }
    }
    
    return { success: true, canCancel: true, promotedId, isWithin24h };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
