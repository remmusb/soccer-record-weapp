<template>
  <view class="container">
    <!-- 创建按钮（仅管理员） -->
    <view class="create-bar" v-if="isAdmin" @click="goCreate">
      <view class="btn-primary">
        <text class="icon">+</text> 创建新场次
      </view>
    </view>

    <!-- 进行中 -->
    <view v-if="ongoing.length > 0" class="section">
      <view class="section-title">🔥 进行中</view>
      <view class="match-card orange" v-for="m in ongoing" :key="m._id" @click="goDetail(m._id)">
        <view class="match-header">
          <view>
            <view class="match-title">{{m.title}}<text v-if="isNewMatch(m)" class="new-badge">新</text></view>
            <view class="match-info">📍 {{m.location || '待定'}} · {{m.date}} {{m.time}}</view>
            <view class="match-info">👥 {{m.registrations?.length || 0}}/{{m.maxPlayers}} 人已报名</view>
            <view v-if="m.ownerId" class="match-owner">
              <text class="tag tag-yellow">👑 {{getPlayerName(m.ownerId)}}</text>
              <text v-if="(m.assistantIds || []).length > 0" class="tag tag-purple">🛡️ {{formatAssistants(m)}}</text>
            </view>
          </view>
          <view class="match-right">
            <view class="status-tag status-ongoing">进行中</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 即将开始 -->
    <view v-if="upcoming.length > 0" class="section">
      <view class="section-title">📅 即将开始</view>
      <view class="match-card blue" v-for="m in upcoming" :key="m._id" @click="goDetail(m._id)">
        <view class="match-header">
          <view>
            <view class="match-title">{{m.title}}<text v-if="isNewMatch(m)" class="new-badge">新</text></view>
            <view class="match-info">📍 {{m.location || '待定'}} · {{m.date}} {{m.time}}</view>
            <view class="match-info">👥 {{m.registrations?.length || 0}}/{{m.maxPlayers}} 人已报名</view>
            <view v-if="m.screenshotDeadline" class="match-deadline">⏰ 截图截止：{{formatDeadline(m.screenshotDeadline)}}</view>
            <view v-if="m.ownerId" class="match-owner">
              <text class="tag tag-yellow">👑 {{getPlayerName(m.ownerId)}}</text>
              <text v-if="(m.assistantIds || []).length > 0" class="tag tag-purple">🛡️ {{formatAssistants(m)}}</text>
            </view>
          </view>
          <view class="match-right">
            <view class="status-tag" :class="getUpcomingStatusClass(m)">{{getUpcomingStatusText(m)}}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 已结束 -->
    <view v-if="completed.length > 0" class="section">
      <view class="section-title">✅ 已结束</view>
      <view class="match-card gray" v-for="m in completed" :key="m._id" @click="goDetail(m._id)">
        <view class="match-header">
          <view>
            <view class="match-title">{{m.title}}<text v-if="isNewMatch(m)" class="new-badge">新</text></view>
            <view class="match-info">📍 {{m.location || '待定'}} · {{m.date}} {{m.time}}</view>
          </view>
          <view class="match-right">
            <view class="status-tag" :class="m.ratingOpen ? 'status-rating' : 'status-completed'">{{m.ratingOpen ? '评分中' : '已完赛'}}</view>
          </view>
        </view>
        <view class="match-result">
          <view class="team-side">
            <view class="team team-a">
              <view class="team-dot" :style="{background: getTeamDotColor(m.teamA)}"></view>
              <view class="team-color-name">{{getColorTeamName(m.teamA.color)}}</view>
              <view class="team-score">{{m.teamA.score}}</view>
            </view>
            <view v-if="getTeamAGoals(m).length > 0" class="team-goals">
              <view class="team-goal-item" v-for="(g, idx) in getTeamAGoals(m)" :key="'a-'+idx">
                <text class="goal-icon">⚽</text>
                <text class="goal-player">{{getPlayerName(g.playerId)}}<text v-if="g.isOwnGoal" class="own-goal-tag">(OG)</text></text>
                <text v-if="g.assistById" class="goal-assist">🅰️ {{getPlayerName(g.assistById)}}</text>
                <text v-if="g.minute" class="goal-minute">{{g.minute}}'</text>
              </view>
            </view>
          </view>
          <view class="vs">:</view>
          <view class="team-side">
            <view class="team team-b">
              <view class="team-score">{{m.teamB.score}}</view>
              <view class="team-color-name">{{getColorTeamName(m.teamB.color)}}</view>
              <view class="team-dot" :style="{background: getTeamDotColor(m.teamB)}"></view>
            </view>
            <view v-if="getTeamBGoals(m).length > 0" class="team-goals">
              <view class="team-goal-item" v-for="(g, idx) in getTeamBGoals(m)" :key="'b-'+idx">
                <text v-if="g.minute" class="goal-minute">{{g.minute}}'</text>
                <text class="goal-icon">⚽</text>
                <text class="goal-player">{{getPlayerName(g.playerId)}}<text v-if="g.isOwnGoal" class="own-goal-tag">(OG)</text></text>
                <text v-if="g.assistById" class="goal-assist">🅰️ {{getPlayerName(g.assistById)}}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="m.mvp && m.mvp.length > 0" class="match-mvp">
          <text class="mvp-label">🏆 MVP:</text>
          <text class="mvp-name" v-for="mvpId in m.mvp" :key="mvpId">{{getPlayerName(mvpId)}}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="allMatches.length === 0" class="empty">
      <view class="empty-icon">⚽</view>
      <view class="empty-text">还没有场次，点击上方创建</view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();

export default {
  data() {
    return {
      allMatches: [],
      players: {},
      isAdmin: false,
    }
  },
  computed: {
    ongoing() {
      return this.allMatches.filter(m => m.status === 'ongoing');
    },
    upcoming() {
      // 即将开始的比赛按比赛时间升序排列（最近的比赛排前面）
      return this.allMatches
        .filter(m => m.status === 'upcoming')
        .sort((a, b) => {
          const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
          const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
          return dateA - dateB;
        });
    },
    completed() {
      return this.allMatches.filter(m => m.status === 'completed');
    }
  },
  onShow() {
    this.loadMatches();
    this.checkAdmin();
    wx.showShareMenu({ withShareTicket: true });
  },
  onShareAppMessage() {
    return {
      title: '⚽ 足球记录 - 记录每一场野球',
      path: '/pages/index/index',
      imageUrl: ''
    };
  },
  methods: {
    async checkAdmin() {
      try {
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        this.isAdmin = result.isAdmin || false;
      } catch (e) {
        this.isAdmin = false;
      }
    },
    async loadMatches() {
      wx.showLoading({ title: '加载中' });
      try {
        const { data } = await db.collection('matches')
          .orderBy('date', 'desc')
          .get();
        this.allMatches = data;
        
        // 预加载球员信息（场主、护法 + 进球/助攻球员）
        const ownerIds = [...new Set(data.filter(m => m.ownerId).map(m => m.ownerId))];
        const assistantIds = [...new Set(data.flatMap(m => m.assistantIds || []).filter(Boolean))];
        const eventPlayerIds = [...new Set(data.flatMap(m => 
          (m.events || []).flatMap(e => [e.playerId, e.assistById].filter(Boolean))
        ))];
        const playerIds = [...new Set([...ownerIds, ...assistantIds, ...eventPlayerIds])];
        if (playerIds.length > 0) {
          const { data: players } = await db.collection('players')
            .where({ _id: db.command.in(playerIds) })
            .get();
          players.forEach(p => {
            this.players[p._id] = p.nickname;
          });
        }
      } catch (e) {
        console.error('加载失败', e);
      }
      wx.hideLoading();
    },
    getPlayerName(id) {
      return this.players[id] || '';
    },
    formatAssistants(m) {
      const ids = m.assistantIds || [];
      if (ids.length === 0) return '';
      const names = ids.map(id => this.players[id] || '?').filter(Boolean);
      return names.join('、');
    },
    formatDeadline(dt) {
      if (!dt) return '';
      return dt.replace('T', ' ');
    },
    getGoals(m) {
      return (m.events || []).filter(e => e.type === 'goal').length;
    },
    getAssists(m) {
      return (m.events || []).filter(e => e.type === 'goal' && e.assistById).length;
    },
    getColorTeamName(color) {
      if (!color) return '';
      const text = String(color).trim().toLowerCase();
      // 中文颜色名直接映射
      if (text.includes('白') || text.includes('white')) return '白队';
      if (text.includes('黑') || text.includes('black')) return '黑队';
      if (text.includes('灰') || text.includes('grey') || text.includes('gray')) return '灰队';
      if (text.includes('红') || text.includes('red')) return '红队';
      if (text.includes('橙') || text.includes('orange')) return '橙队';
      if (text.includes('黄') || text.includes('yellow')) return '黄队';
      if (text.includes('绿') || text.includes('green')) return '绿队';
      if (text.includes('青') || text.includes('cyan') || text.includes('teal')) return '青队';
      if (text.includes('蓝') || text.includes('blue')) return '蓝队';
      if (text.includes('紫') || text.includes('purple') || text.includes('violet')) return '紫队';
      if (text.includes('粉') || text.includes('pink') || text.includes('玫')) return '粉队';
      // 非hex格式直接返回空
      let hex = text.replace('#', '').replace(/^0x/, '');
      if (!/^[0-9a-f]{3,8}$/i.test(hex)) return '';
      // 3位hex扩展为6位
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length < 6) return '';
      hex = hex.substring(0, 6);
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      if (max > 220 && min > 220) return '白队';
      if (max < 60) return '黑队';
      if (diff < 40 && min > 80) return '灰队';
      if (r > 150 && g < 100 && b < 100) return '红队';
      if (r > 180 && g > 100 && g < 150 && b < 100) return '橙队';
      if (r > 180 && g > 150 && b < 120) return '黄队';
      if (g > 120 && r < g * 0.7 && b < g * 0.7) return '绿队';
      if (g > 100 && b > 100 && r < g * 0.5 && r < b * 0.5) return '青队';
      if (b > 150 && r < 120 && g < 120) return '蓝队';
      if (b > 120 && r > 120 && g < 100) return '紫队';
      if (r > 180 && g > 100 && g < 150 && b > 150) return '粉队';
      return '';
    },
    getTeamDotColor(team) {
      const colorName = String(team?.color || team?.name || '').trim().toLowerCase();
      if (colorName.includes('白') || colorName.includes('white')) return '#e5e7eb';
      if (colorName.includes('黑') || colorName.includes('black')) return '#1f2937';
      if (colorName.includes('灰') || colorName.includes('grey') || colorName.includes('gray')) return '#6b7280';
      if (colorName.includes('红') || colorName.includes('red')) return '#dc2626';
      if (colorName.includes('橙') || colorName.includes('orange')) return '#f97316';
      if (colorName.includes('黄') || colorName.includes('yellow')) return '#facc15';
      if (colorName.includes('绿') || colorName.includes('green')) return '#16a34a';
      if (colorName.includes('青') || colorName.includes('cyan') || colorName.includes('teal')) return '#06b6d4';
      if (colorName.includes('蓝') || colorName.includes('blue')) return '#3b82f6';
      if (colorName.includes('紫') || colorName.includes('purple') || colorName.includes('violet')) return '#9333ea';
      if (colorName.includes('粉') || colorName.includes('pink') || colorName.includes('玫')) return '#ec4899';
      if (/^#[0-9a-f]{3,8}$/i.test(colorName)) return colorName;
      return '#9ca3af';
    },
    getTeamAGoals(m) {
      const aPlayers = new Set(m.teamA?.players || []);
      const allEvents = m.events || [];
      const assistEvents = allEvents.filter(e => e.type === 'assist');
      return allEvents
        .filter(e => (e.type === 'goal' && aPlayers.has(e.playerId)) || (e.type === 'own_goal' && !aPlayers.has(e.playerId)))
        .map(g => {
          const assist = assistEvents.find(a => a.assistById === g.playerId && a.minute === g.minute);
          return { ...g, assistById: assist ? assist.playerId : g.assistById, isOwnGoal: g.type === 'own_goal' };
        });
    },
    getTeamBGoals(m) {
      const bPlayers = new Set(m.teamB?.players || []);
      const allEvents = m.events || [];
      const assistEvents = allEvents.filter(e => e.type === 'assist');
      return allEvents
        .filter(e => (e.type === 'goal' && bPlayers.has(e.playerId)) || (e.type === 'own_goal' && !bPlayers.has(e.playerId)))
        .map(g => {
          const assist = assistEvents.find(a => a.assistById === g.playerId && a.minute === g.minute);
          return { ...g, assistById: assist ? assist.playerId : g.assistById, isOwnGoal: g.type === 'own_goal' };
        });
    },
    getTeamColor(m, playerId) {
      if ((m.teamA?.players || []).includes(playerId)) return m.teamA?.color || '#16a34a';
      if ((m.teamB?.players || []).includes(playerId)) return m.teamB?.color || '#dc2626';
      return '#9ca3af';
    },
    isNewMatch(m) {
      if (!m.createdAt) return false;
      let createdAt = m.createdAt;
      // 处理云数据库 Date 类型（可能是 { __type__: 'Date', iso: '...' } 或 { _date: { numberLong: '...' } }）
      if (typeof createdAt === 'object') {
        if (createdAt.iso) createdAt = createdAt.iso;
        else if (createdAt._date && createdAt._date.numberLong) createdAt = createdAt._date.numberLong;
        else if (createdAt._date) createdAt = createdAt._date;
        else return false;
      }
      if (typeof createdAt === 'string' && /^\d+$/.test(createdAt)) {
        createdAt = parseInt(createdAt);
      }
      const created = new Date(createdAt);
      if (isNaN(created.getTime())) return false;
      const now = new Date();
      const diff = now - created;
      return diff < 24 * 60 * 60 * 1000; // 24小时内
    },
    getUpcomingStatusText(m) {
      if (m.teamConfirmed) return '已分队';
      if (m.registrationClosed) return '已关闭报名';
      return '报名中';
    },
    getUpcomingStatusClass(m) {
      if (m.teamConfirmed) return 'status-split';
      if (m.registrationClosed) return 'status-closed';
      return 'status-upcoming';
    },
    goCreate() {
      uni.navigateTo({ url: '/pages/match/create' });
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/match/detail?id=${id}` });
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  padding-bottom: 40rpx;
  background: linear-gradient(180deg, #f0f5ff 0%, #f5f7fa 30%, #f5f7fa 100%);
  min-height: 100vh;
}

.create-bar {
  margin-bottom: 24rpx;
}

.icon {
  margin-right: 8rpx;
  font-size: 36rpx;
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #475569;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.match-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
  position: relative;
  overflow: hidden;
}

.match-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4rpx;
}

.match-card.orange::before {
  background: linear-gradient(90deg, #f97316, #fb923c);
}
.match-card.blue::before {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}
.match-card.gray::before {
  background: linear-gradient(90deg, #94a3b8, #cbd5e1);
}

.match-card.orange {
  background: linear-gradient(135deg, #ffffff, #fff7ed);
}
.match-card.blue {
  background: linear-gradient(135deg, #ffffff, #eff6ff);
}
.match-card.gray {
  background: linear-gradient(135deg, #ffffff, #f8fafc);
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.match-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 8rpx;
}

.match-info {
  font-size: 26rpx;
  color: #64748b;
  margin-top: 4rpx;
  font-weight: 500;
}

.match-deadline {
  font-size: 24rpx;
  color: #f97316;
  margin-top: 8rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.match-owner {
  margin-top: 10rpx;
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.match-right {
  text-align: right;
  flex-shrink: 0;
  margin-left: 20rpx;
}

.match-score {
  font-size: 48rpx;
  font-weight: 800;
  color: #16a34a;
  margin-bottom: 8rpx;
}

.match-result {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-top: 20rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #f8fafc, #f0f9ff);
  border-radius: 16rpx;
  gap: 12rpx;
}

.team-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.team {
  display: flex;
  align-items: center;
  gap: 12rpx;
  width: 100%;
}

.team-a { justify-content: flex-start; }
.team-b { justify-content: flex-end; }

.team-dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  flex-shrink: 0;
  border: 3rpx solid #fff;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
}

.team-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #374151;
}

.team-score {
  font-size: 44rpx;
  font-weight: 900;
  color: #1e293b;
}

.vs {
  font-size: 28rpx;
  font-weight: 800;
  color: #94a3b8;
  flex-shrink: 0;
  align-self: center;
  padding: 8rpx 12rpx;
  background: #f1f5f9;
  border-radius: 10rpx;
}

.team-goals {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 4rpx;
}

.team-goal-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  padding: 8rpx 12rpx;
  background: #fff;
  border-radius: 10rpx;
  flex-wrap: wrap;
  box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.05);
  font-weight: 500;
}

.goal-icon {
  font-size: 22rpx;
  flex-shrink: 0;
}

.goal-player {
  color: #334155;
  font-weight: 600;
  flex-shrink: 0;
}

.goal-assist {
  color: #2563eb;
  background: #eff6ff;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.own-goal-tag {
  color: #dc2626;
  font-size: 22rpx;
  margin-left: 4rpx;
  font-weight: 800;
}

.goal-minute {
  color: #94a3b8;
  font-size: 22rpx;
  margin-left: auto;
  flex-shrink: 0;
  font-weight: 500;
}

.team-color-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #475569;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.status-upcoming {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1e40af;
}

.status-ongoing {
  background: linear-gradient(135deg, #ffedd5, #fed7aa);
  color: #9a3412;
}

.status-completed {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #166534;
}

.status-closed {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  color: #64748b;
}

.status-split {
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  color: #5b21b6;
}

.status-rating {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #16a34a;
}

.new-badge {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  margin-left: 8rpx;
  font-weight: 700;
  line-height: 1;
  vertical-align: middle;
}

.empty {
  text-align: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #94a3b8;
}

/* 标签样式 */
.tag { display: inline-flex; align-items: center; padding: 4rpx 10rpx; border-radius: 8rpx; font-size: 20rpx; font-weight: 600; }
.tag-yellow { background: #fef3c7; color: #92400e; }
.tag-purple { background: #ede9fe; color: #5b21b6; }

/* 创建按钮 */
.btn-primary { background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; text-align: center; padding: 26rpx 0; border-radius: 14rpx; font-size: 32rpx; font-weight: 700; box-shadow: 0 4rpx 12rpx rgba(22,163,74,0.3); }

/* MVP 展示 */
.match-mvp { display: flex; align-items: center; gap: 8rpx; margin-top: 16rpx; padding: 10rpx 16rpx; background: linear-gradient(135deg, #fefce8, #fef9c3); border-radius: 10rpx; }
.mvp-label { font-size: 24rpx; font-weight: 800; color: #eab308; flex-shrink: 0; }
.mvp-name { font-size: 26rpx; font-weight: 700; color: #854d0e; }
</style>
