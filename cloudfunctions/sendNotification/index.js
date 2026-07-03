const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 模板定义：根据实际绑定的模板字段配置
const TEMPLATES = {
  // 组队成功通知: thing1=队长/标题(5字), thing6=队伍名称(5字)
  teamNotice: {
    id: 'b__Xfgl9V5Gb4wR620BxvGwkNYUc-7GTIhMbvCaVl7Y',
    fields: { thing1: 'title', thing6: 'detail' }
  },
  // 比赛发布通过提醒: time1=比赛时间, thing2=比赛地点(20字)
  matchPublish: {
    id: '9yHUbypikNHuoi24brxXjx1ssA23qOhL-7wkKr7Yno8',
    fields: { time1: 'time', thing2: 'location' }
  }
};

exports.main = async (event, context) => {
  const { type, matchId, playerIds, customMessage } = event;
  
  if (!matchId || matchId === 'undefined' || matchId === '') {
    return { success: false, error: 'matchId 无效' };
  }
  if (!type) {
    return { success: false, error: '缺少 type 参数' };
  }
  
  try {
    const db = cloud.database();
    const { data: match } = await db.collection('matches').doc(matchId).get();
    if (!match) return { success: false, error: '场次不存在' };
    
    const allPlayerIds = [...new Set((match.registrations || []).map(r => r.playerId))];
    const ownerAndAssistants = [match.ownerId, ...(match.assistantIds || [])].filter(Boolean);
    const allIds = [...new Set([...allPlayerIds, ...ownerAndAssistants])];
    
    let playerMap = {};
    if (allIds.length > 0) {
      const { data: players } = await db.collection('players')
        .where({ _id: db.command.in(allIds) })
        .get();
      players.forEach(p => playerMap[p._id] = p);
    }
    
    const cut = (str, len) => str?.length > len ? str.substring(0, len - 1) + '…' : str;
    const matchTitle = cut(match.title, 5);      // thing1 / time1 用
    const matchTime = cut(match.time, 20);        // time1 用（时间字段稍长）
    const matchLocation = cut(match.location || match.title, 20); // thing2 用
    
    // 诊断日志：输出所有 registrations 的 status 分布
    const regs = match.registrations || [];
    const statusDist = {};
    regs.forEach(r => {
      const key = r.status === undefined ? '(undefined)' : (r.status === '' ? '(empty)' : r.status);
      statusDist[key] = (statusDist[key] || 0) + 1;
    });
    console.log(`[sendNotification] matchId=${matchId}, type=${type}, totalRegs=${regs.length}, statusDist=${JSON.stringify(statusDist)}`);
    
    // 判断是否为有效确认状态的辅助函数（向后兼容：无status或空字符串也视为已确认）
    const isConfirmed = (r) => {
      if (r.status === 'confirmed' || r.status === 'pending_screenshot' || r.status === 'screenshot_uploaded') return true;
      if (r.status === undefined || r.status === null || r.status === '') return true;
      return false;
    };
    
    const sendOne = async (pid, templateId, data) => {
      const p = playerMap[pid];
      if (!p || !p._openid) return { success: false, error: '无openid' };
      try {
        const res = await cloud.openapi.subscribeMessage.send({
          touser: p._openid, templateId, page: `pages/match/detail?id=${matchId}`, data
        });
        if (!res) return { success: false, error: 'API返回空' };
        // 成功: errcode === 0; 某些情况下 errcode 为 undefined 但调用成功
        if (res.errcode === 0) return { success: true };
        if (res.errcode === undefined || res.errcode === null) {
          // 没有errcode字段，但调用未抛异常，视为成功
          return { success: true };
        }
        return { success: false, error: `[${res.errcode}] ${res.errmsg || '未知错误'}` };
      } catch (e) { return { success: false, error: e.message }; }
    };
    
    // 并行发送一批消息，避免串行超时
    const sendBatch = async (tasks) => {
      const promises = tasks.map(t => sendOne(t.pid, t.templateId, t.data).then(r => ({ playerId: t.pid, ...t.meta, ...r })));
      return await Promise.all(promises);
    };
    
    let results = [];
    
    if (type === 'new_match') {
      // 新场次 → 比赛发布提醒模板 (time1, thing2)
      const { data: allPlayers } = await db.collection('players').get();
      const msg = customMessage || matchLocation;
      const tasks = allPlayers
        .filter(p => p._openid)
        .map(p => ({
          pid: p._id,
          templateId: TEMPLATES.matchPublish.id,
          data: { time1: { value: matchTime }, thing2: { value: cut(msg, 20) } },
          meta: {}
        }));
      results = await sendBatch(tasks);
      
    } else if (type === 'confirmed') {
      // 确认名单 → 组队成功通知模板 (thing1, thing6)
      const waitlistList = playerIds
        ? regs.filter(r => r.status === 'WL' && playerIds.includes(r.playerId))
        : regs.filter(r => r.status === 'WL');
      const confirmedList = playerIds
        ? regs.filter(r => isConfirmed(r) && playerIds.includes(r.playerId))
        : regs.filter(r => isConfirmed(r));
      
      console.log(`[sendNotification confirmed] confirmedList=${confirmedList.length}, waitlistList=${waitlistList.length}`);
      
      const confirmedTasks = confirmedList.map(r => ({
        pid: r.playerId,
        templateId: TEMPLATES.teamNotice.id,
        data: { thing1: { value: matchTitle }, thing6: { value: cut('名单已确认', 5) } },
        meta: { type: 'confirmed' }
      }));
      const waitlistTasks = waitlistList.map(r => ({
        pid: r.playerId,
        templateId: TEMPLATES.teamNotice.id,
        data: { thing1: { value: matchTitle }, thing6: { value: cut('候补', 5) } },
        meta: { type: 'waitlist' }
      }));
      results = await sendBatch([...confirmedTasks, ...waitlistTasks]);
      
    } else if (type === 'promoted') {
      // 候补转正 → 组队成功通知模板
      const tasks = (playerIds || []).map(pid => ({
        pid,
        templateId: TEMPLATES.teamNotice.id,
        data: { thing1: { value: matchTitle }, thing6: { value: cut('候补成功', 5) } },
        meta: {}
      }));
      results = await sendBatch(tasks);
      
    } else if (type === 'team_split') {
      // 分队 → 组队成功通知模板 (thing1=标题, thing6=队伍)
      const confirmedList = regs.filter(r => isConfirmed(r));
      console.log(`[sendNotification team_split] confirmedList=${confirmedList.length}`);
      const tasks = confirmedList.map(r => {
        const pid = r.playerId;
        const inA = (match.teamA?.players || []).includes(pid);
        const inB = (match.teamB?.players || []).includes(pid);
        const teamName = inA ? (match.teamA?.name || '蓝') : (match.teamB?.name || '白');
        return {
          pid,
          templateId: TEMPLATES.teamNotice.id,
          data: { thing1: { value: matchTitle }, thing6: { value: cut(teamName, 5) } },
          meta: {}
        };
      }).filter(t => t.data.thing6.value); // 只保留已分队的
      results = await sendBatch(tasks);
      
    } else if (type === 'rating_open') {
      // 评分开放 → 组队成功通知模板
      const confirmedList = regs.filter(r => isConfirmed(r));
      console.log(`[sendNotification rating_open] confirmedList=${confirmedList.length}`);
      const tasks = confirmedList.map(r => ({
        pid: r.playerId,
        templateId: TEMPLATES.teamNotice.id,
        data: { thing1: { value: matchTitle }, thing6: { value: cut('评分已开放', 5) } },
        meta: {}
      }));
      results = await sendBatch(tasks);
      
    } else if (type === 'screenshot_confirmed') {
      // 截图确认成功 → 组队成功通知模板 (thing1, thing6)
      const notifyIds = playerIds || [];
      const tasks = notifyIds.map(pid => ({
        pid,
        templateId: TEMPLATES.teamNotice.id,
        data: { thing1: { value: matchTitle }, thing6: { value: cut('截图已确认', 5) } },
        meta: {}
      }));
      results = await sendBatch(tasks);
      
    } else if (type === 'reminder') {
      // 赛前提醒 → 组队成功通知模板
      const notifyIds = [match.ownerId, ...(match.assistantIds || [])].filter(Boolean);
      const tasks = notifyIds.map(pid => ({
        pid,
        templateId: TEMPLATES.teamNotice.id,
        data: { thing1: { value: matchTitle }, thing6: { value: cut(pid === match.ownerId ? '场主提醒' : '护法提醒', 5) } },
        meta: { role: pid === match.ownerId ? '场主' : '护法' }
      }));
      results = await sendBatch(tasks);
    }
    
    const sent = results.filter(r => r.success).length;
    const total = results.length;
    return { success: true, sent, total, details: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
