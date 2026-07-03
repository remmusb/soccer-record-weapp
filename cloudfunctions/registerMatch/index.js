const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, matchId, playerId, screenshot, tempPlayer } = event;
  
  if (!matchId) return { success: false, error: '缺少 matchId' };
  if (!action) return { success: false, error: '缺少 action' };
  
  const { OPENID } = cloud.getWXContext();
  
  try {
    const { data: match } = await db.collection('matches').doc(matchId).get();
    if (!match) return { success: false, error: '场次不存在' };
    
    // 检查管理员权限
    let isAdmin = false;
    if (OPENID) {
      const player = await db.collection('players').where({ _openid: OPENID }).get();
      if (player.data.length > 0) {
        const admin = await db.collection('admins').where({ playerId: player.data[0]._id }).get();
        isAdmin = admin.data.length > 0;
      }
    }
    
    // 获取当前报名列表
    let registrations = match.registrations || [];
    
    // 1. 用户报名
    if (action === 'register') {
      const targetId = playerId;
      if (!targetId) return { success: false, error: '缺少 playerId' };
      
      // 非管理员只能为自己报名
      const currentPlayer = await db.collection('players').where({ _openid: OPENID }).get();
      if (!isAdmin && currentPlayer.data.length > 0 && currentPlayer.data[0]._id !== targetId) {
        return { success: false, error: '只能为自己报名' };
      }
      
      // 检查是否已报名
      if (registrations.some(r => r.playerId === targetId)) {
        return { success: false, error: '已报名' };
      }
      
      const now = new Date();
      let isDeadlinePassed = false;
      if (match.screenshotDeadline) {
        const deadline = new Date(match.screenshotDeadline.replace('T', ' '));
        isDeadlinePassed = now >= deadline;
      }
      
      const status = (match.needScreenshot === false || isDeadlinePassed) ? 'confirmed' : 'pending_screenshot';
      
      registrations.push({
        playerId: targetId,
        registeredAt: new Date(),
        status,
        screenshot: '',
        screenshotUploadedAt: ''
      });
      
      await db.collection('matches').doc(matchId).update({
        data: { registrations }
      });
      
      return { success: true, status, message: status === 'pending_screenshot' ? '报名成功，请尽快上传截图' : '报名成功' };
    }
    
    // 2. 取消报名
    if (action === 'unregister') {
      const targetId = playerId;
      if (!targetId) return { success: false, error: '缺少 playerId' };
      
      // 非管理员只能取消自己的报名
      const currentPlayer = await db.collection('players').where({ _openid: OPENID }).get();
      if (!isAdmin && currentPlayer.data.length > 0 && currentPlayer.data[0]._id !== targetId) {
        return { success: false, error: '只能取消自己的报名' };
      }
      
      const idx = registrations.findIndex(r => r.playerId === targetId);
      if (idx < 0) return { success: false, error: '未报名' };
      
      registrations.splice(idx, 1);
      
      await db.collection('matches').doc(matchId).update({
        data: { registrations }
      });
      
      return { success: true, message: '已取消报名' };
    }
    
    // 3. 上传截图
    if (action === 'uploadScreenshot') {
      const targetId = playerId;
      if (!targetId) return { success: false, error: '缺少 playerId' };
      if (!screenshot) return { success: false, error: '缺少 screenshot' };
      
      const currentPlayer = await db.collection('players').where({ _openid: OPENID }).get();
      if (!isAdmin && currentPlayer.data.length > 0 && currentPlayer.data[0]._id !== targetId) {
        return { success: false, error: '只能上传自己的截图' };
      }
      
      const idx = registrations.findIndex(r => r.playerId === targetId);
      if (idx < 0) return { success: false, error: '未报名' };
      
      // 允许重新上传截图（覆盖原有截图）
      registrations[idx].screenshot = screenshot;
      registrations[idx].screenshotUploadedAt = new Date();
      
      // 如果之前是 pending_screenshot 或 screenshot_uploaded，更新为 screenshot_uploaded（等待管理员确认）
      if (registrations[idx].status === 'pending_screenshot' || registrations[idx].status === 'screenshot_uploaded') {
        registrations[idx].status = 'screenshot_uploaded';
      }
      
      await db.collection('matches').doc(matchId).update({
        data: { registrations }
      });
      
      return { success: true, status: registrations[idx].status, message: '截图上传成功，等待管理员确认' };
    }
    
    // 3.5 管理员确认截图
    if (action === 'confirmScreenshot') {
      if (!isAdmin) return { success: false, error: '无权限' };
      
      const targetId = playerId;
      if (!targetId) return { success: false, error: '缺少 playerId' };
      
      const idx = registrations.findIndex(r => r.playerId === targetId);
      if (idx < 0) return { success: false, error: '未报名' };
      
      if (registrations[idx].status !== 'screenshot_uploaded') {
        return { success: false, error: '该球员未上传截图' };
      }
      
      registrations[idx].status = 'confirmed';
      registrations[idx].confirmedAt = new Date();
      
      await db.collection('matches').doc(matchId).update({
        data: { registrations }
      });
      
      // 发送通知给球员
      try {
        await cloud.callFunction({
          name: 'sendNotification',
          data: { 
            type: 'screenshot_confirmed', 
            matchId: matchId,
            playerIds: [targetId]
          }
        });
      } catch (e) {
        console.error('截图确认通知发送失败:', e);
      }
      
      return { success: true, message: '截图已确认' };
    }
    
    // 4. 管理员添加球员
    if (action === 'adminAdd') {
      if (!isAdmin) return { success: false, error: '无权限' };
      
      const targetId = playerId;
      if (!targetId) return { success: false, error: '缺少 playerId' };
      
      if (registrations.some(r => r.playerId === targetId)) {
        return { success: false, error: '该球员已报名' };
      }
      
      registrations.push({
        playerId: targetId,
        registeredAt: new Date(),
        status: 'confirmed',
        screenshot: '',
        screenshotUploadedAt: ''
      });
      
      await db.collection('matches').doc(matchId).update({
        data: { registrations }
      });
      
      return { success: true, message: '添加成功' };
    }
    
    // 5. 管理员移除球员
    if (action === 'adminRemove') {
      if (!isAdmin) return { success: false, error: '无权限' };
      
      const targetId = playerId;
      if (!targetId) return { success: false, error: '缺少 playerId' };
      
      const idx = registrations.findIndex(r => r.playerId === targetId);
      if (idx < 0) return { success: false, error: '未报名' };
      
      registrations.splice(idx, 1);
      
      await db.collection('matches').doc(matchId).update({
        data: { registrations }
      });
      
      return { success: true, message: '移除成功' };
    }
    
    // 6. 管理员添加临时队员
    if (action === 'addTempPlayer') {
      if (!isAdmin) return { success: false, error: '无权限' };
      
      if (!tempPlayer || !tempPlayer.nickname) {
        return { success: false, error: '缺少临时队员信息' };
      }
      
      // 生成临时队员ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      registrations.push({
        playerId: tempId,
        isTempPlayer: true,
        tempNickname: tempPlayer.nickname.trim(),
        registeredAt: new Date(),
        status: 'confirmed',
        screenshot: '',
        screenshotUploadedAt: ''
      });
      
      await db.collection('matches').doc(matchId).update({
        data: { registrations }
      });
      
      return { success: true, message: '临时队员添加成功', tempId };
    }
    
    // 7. 管理员移除临时队员
    if (action === 'removeTempPlayer') {
      if (!isAdmin) return { success: false, error: '无权限' };
      
      const targetId = playerId;
      if (!targetId) return { success: false, error: '缺少 playerId' };
      
      const idx = registrations.findIndex(r => r.playerId === targetId && r.isTempPlayer);
      if (idx < 0) return { success: false, error: '未找到该临时队员' };
      
      registrations.splice(idx, 1);
      
      await db.collection('matches').doc(matchId).update({
        data: { registrations }
      });
      
      return { success: true, message: '临时队员已移除' };
    }
    
    return { success: false, error: '未知 action' };
  } catch (e) {
    console.error('registerMatch 错误:', e);
    return { success: false, error: e.message || '操作失败' };
  }
};