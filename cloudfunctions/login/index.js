const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  
  console.log('login OPENID:', OPENID);
  
  // 检查是否已有球员资料
  const player = await db.collection('players').where({ _openid: OPENID }).get();
  console.log('players query result:', player.data.length, player.data[0]?._id);
  const playerId = player.data.length > 0 ? player.data[0]._id : null;
  
  // 检查是否是管理员（通过 playerId 或 openid 关联）
  let isAdmin = false;
  
  // 方式1：通过 playerId
  if (playerId) {
    const adminByPlayerId = await db.collection('admins').where({ playerId }).get();
    console.log('admins by playerId:', adminByPlayerId.data.length);
    if (adminByPlayerId.data.length > 0) {
      isAdmin = true;
    }
  }
  
  // 方式2：通过 openid（fallback，用于 player 记录丢失的情况）
  if (!isAdmin) {
    const adminByOpenid = await db.collection('admins').where({ openid: OPENID }).get();
    console.log('admins by openid:', adminByOpenid.data.length);
    if (adminByOpenid.data.length > 0) {
      isAdmin = true;
      // 如果 playerId 存在但 admins 中只有 openid，自动更新 playerId
      if (playerId) {
        await db.collection('admins').where({ openid: OPENID }).update({
          data: { playerId: playerId }
        });
        console.log('已自动更新 admin 的 playerId');
      }
    }
  }
  
  // 检查是否是高级管理员
  let isSuperAdmin = false;
  if (isAdmin) {
    const adminRecord = await db.collection('admins').where(
      playerId ? { playerId } : { openid: OPENID }
    ).get();
    if (adminRecord.data.length > 0 && adminRecord.data[0].role === 'super_admin') {
      isSuperAdmin = true;
    }
  }
  
  return { 
    openid: OPENID, 
    playerId,
    isPlayer: player.data.length > 0,
    isAdmin,
    isSuperAdmin
  };
};
