const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const now = new Date();
  
  // 查找24小时内开始的比赛（且未发送过24h提醒）
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: matches24h } = await db.collection('matches')
    .where({
      date: db.command.gte(now.toISOString().split('T')[0]),
      status: db.command.in(['upcoming', 'ongoing']),
      teamConfirmed: true,
      reminder24hSent: db.command.neq(true)
    })
    .get();
  
  // 查找3小时内开始的比赛
  const in3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const { data: matches3h } = await db.collection('matches')
    .where({
      date: db.command.gte(now.toISOString().split('T')[0]),
      status: db.command.in(['upcoming', 'ongoing']),
      teamConfirmed: true,
      reminder3hSent: db.command.neq(true)
    })
    .get();
  
  const results = { sent24h: 0, sent3h: 0 };
  
  for (const m of matches24h) {
    const matchTime = new Date(`${m.date}T${m.time}`);
    if (matchTime <= in24h && matchTime > now) {
      // 发送24小时提醒
      await sendReminder(db, m, '24h');
      await db.collection('matches').doc(m._id).update({ data: { reminder24hSent: true } });
      results.sent24h++;
    }
  }
  
  for (const m of matches3h) {
    const matchTime = new Date(`${m.date}T${m.time}`);
    if (matchTime <= in3h && matchTime > now) {
      // 发送3小时提醒
      await sendReminder(db, m, '3h');
      await db.collection('matches').doc(m._id).update({ data: { reminder3hSent: true } });
      results.sent3h++;
    }
  }
  
  return results;
};

async function sendReminder(db, match, type) {
  const timeLabel = type === '24h' ? '24小时' : '3小时';
  try {
    await cloud.callFunction({
      name: 'sendNotification',
      data: { type: 'reminder', matchId: match._id, customMessage: timeLabel }
    });
  } catch (e) { console.error('提醒发送失败', e); }
}
