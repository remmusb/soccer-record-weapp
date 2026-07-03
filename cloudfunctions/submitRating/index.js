const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { matchId, peerRatings, adminRatings, fromId } = event;
  
  console.log('submitRating 收到请求:', { matchId, peerRatingsCount: peerRatings?.length, adminRatingsCount: adminRatings?.length, fromId });
  
  try {
    const tasks = [];
    
    // 提交队友互评
    if (peerRatings && peerRatings.length > 0) {
      for (const r of peerRatings) {
        if (r.score <= 0) continue;
        console.log('提交 peerRating:', r.pid, r.score);
        tasks.push(
          db.collection('players').doc(r.pid).update({
            data: {
              'ratings.peerRatings': _.push({
                matchId: matchId,
                score: r.score,
                fromId: fromId,
                createdAt: db.serverDate()
              })
            }
          })
        );
      }
    }
    
    // 提交管理员评分
    if (adminRatings && adminRatings.length > 0) {
      for (const r of adminRatings) {
        if (r.score <= 0) continue;
        console.log('提交 adminRating:', r.pid, r.score);
        tasks.push(
          db.collection('players').doc(r.pid).update({
            data: {
              'ratings.adminRatings': _.push({
                matchId: matchId,
                score: r.score,
                fromId: fromId,
                createdAt: db.serverDate()
              })
            }
          })
        );
      }
    }
    
    console.log('tasks count:', tasks.length);
    
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
    
    console.log('submitRating 成功, count:', tasks.length);
    return { success: true, count: tasks.length };
  } catch (e) {
    console.error('submitRating 失败:', e);
    return { success: false, error: e.message };
  }
};