<template>
  <view class="container">
    <view v-if="loading" class="loading">
      <view class="loading-spinner">⏳</view>
      <view class="loading-text">加载中...</view>
    </view>
    
    <view v-else-if="match" class="match-detail">
      <!-- 比赛信息 -->
      <view class="card">
        <view class="match-header">
          <view>
            <view class="match-title">{{match.title}}<text v-if="isNew" class="new-badge">新</text></view>
            <view class="match-info">📅 {{match.date}} {{match.time}}</view>
            <view class="match-info">📍 {{match.location}}</view>
            <view class="match-info">{{statusText}}</view>
            <view v-if="match.screenshotDeadline" class="match-deadline">⏰ 截图截止：{{match.screenshotDeadline}}</view>
          </view>
          <view class="match-right">
            <view class="status-tag" :class="statusClass">{{statusLabel}}</view>
          </view>
        </view>
        
        <!-- 比分 -->
        <view class="match-result" v-if="match.status !== 'upcoming'">
          <view class="team-side">
            <view class="team team-a">
              <view class="team-dot" :style="{background: match.teamA?.color || '#16a34a'}"></view>
              <view class="team-color-name">{{match.teamA?.name || 'A队'}}</view>
              <view class="team-score">{{match.teamA?.score || 0}}</view>
            </view>
          </view>
          <view class="vs">:</view>
          <view class="team-side">
            <view class="team team-b">
              <view class="team-score">{{match.teamB?.score || 0}}</view>
              <view class="team-color-name">{{match.teamB?.name || 'B队'}}</view>
              <view class="team-dot" :style="{background: match.teamB?.color || '#dc2626'}"></view>
            </view>
          </view>
        </view>
        
        <!-- 退出报名按钮 -->
        <view class="btn-group" v-if="isRegistered && match.status === 'upcoming'">
          <view class="btn-secondary" @click="cancelRegister(currentPlayerId)">退出报名</view>
        </view>
      </view>
      
      <!-- 管理员操作（场次信息下方、接龙上方） -->
      <view class="card" v-if="isAdmin">
        <view class="section-title">🔧 管理员操作</view>
        <view class="admin-grid">
          <view class="admin-btn" v-if="match.status === 'upcoming'" @click="goEdit">
            <text class="admin-icon">📝</text>
            <text class="admin-label">编辑信息</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming'" @click="confirmTeam">
            <text class="admin-icon">📋</text>
            <text class="admin-label">{{match.teamConfirmed ? '重新确认' : '确认名单'}}</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming'" @click="toggleRegistration">
            <text class="admin-icon">🔒</text>
            <text class="admin-label">{{match.registrationClosed ? '开启报名' : '关闭报名'}}</text>
          </view>
          <view class="admin-btn" @click="goTeamSplit">
            <text class="admin-icon">⚙️</text>
            <text class="admin-label">调整分队</text>
          </view>
          <view class="admin-btn" @click="goRecord">
            <text class="admin-icon">📝</text>
            <text class="admin-label">{{match.status === 'completed' ? '查看赛况' : '记录赛况'}}</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming'" @click="changeOwner">
            <text class="admin-icon">👑</text>
            <text class="admin-label">场主/护法</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming'" @click="startMatch">
            <text class="admin-icon">▶️</text>
            <text class="admin-label">开始比赛</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'ongoing'" @click="endMatch">
            <text class="admin-icon">⏹️</text>
            <text class="admin-label">结束比赛</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'completed'" @click="toggleRating">
            <text class="admin-icon">⭐</text>
            <text class="admin-label">{{match.ratingOpen ? '关闭评分' : '开启评分'}}</text>
          </view>
          <view class="admin-btn" @click="deleteMatch">
            <text class="admin-icon">🗑️</text>
            <text class="admin-label">删除场次</text>
          </view>
        </view>
      </view>
      
      <!-- 消息测试（仅管理员） -->
      <view class="card" v-if="isAdmin">
        <view class="section-title">🔔 消息测试</view>
        <view class="test-grid">
          <view class="test-btn" @click="testNotify('new_match')">新场次</view>
          <view class="test-btn" @click="testNotify('confirm_team')">确认名单</view>
          <view class="test-btn" @click="testNotify('team_split')">分队</view>
          <view class="test-btn" @click="testNotify('rating_open')">评分</view>
          <view class="test-btn" @click="testNotify('owner_reminder_24h')">场主24h</view>
          <view class="test-btn" @click="testNotify('owner_reminder_3h')">场主3h</view>
          <view class="test-btn" @click="testNotify('assistant_reminder_24h')">护法24h</view>
          <view class="test-btn" @click="testNotify('assistant_reminder_3h')">护法3h</view>
        </view>
      </view>
      
      <!-- 场主/护法 -->
      <view class="card" v-if="match.ownerId || (match.assistantIds || []).length > 0">
        <view class="section-title">👑 场主/护法</view>
        <view class="owner-item">
          <text class="owner-label">场主</text>
          <text class="owner-name">{{ownerName}}</text>
          <text v-if="isAdmin" class="owner-action" @click="changeOwner">更换</text>
        </view>
        <view class="owner-item" v-for="aid in match.assistantIds || []" :key="aid">
          <text class="owner-label">护法</text>
          <text class="owner-name">{{players[aid]?.nickname || '?'}}</text>
          <text v-if="isAdmin" class="owner-action" @click="removeAssistant(aid)">移除</text>
        </view>
        <view v-if="isAdmin && (match.assistantIds || []).length < 4" class="owner-item">
          <text class="owner-label">护法</text>
          <text class="owner-action" @click="addAssistant">+ 添加</text>
        </view>
      </view>
      
      <!-- 报名接龙 -->
      <view class="card">
        <view class="section-header">
          <view class="section-title">👥 报名接龙</view>
          <view class="section-count">{{registrations.length}}人</view>
        </view>
        <view class="reg-list" v-if="registrations.length > 0">
          <view class="reg-item" v-for="(r, index) in registrations" :key="r.playerId">
            <view class="reg-info">
              <view class="reg-name-row">
                <text v-if="r.isTempPlayer" class="temp-tag">👤</text>
                <view class="player-name-link" @click.stop="!r.isTempPlayer && goPlayerDetail(r.playerId)">
                  {{r.isTempPlayer ? r.tempNickname : (r.player?.nickname || '未知')}}
                </view>
                <text v-if="r.player?.kttLast4" class="ktt-tag">({{r.player.kttLast4}})</text>
              </view>
              <view class="reg-tags">
                <text v-if="r.isTempPlayer" class="tag tag-gray">临时</text>
                <text v-if="match.ownerId === r.playerId" class="tag tag-yellow">👑</text>
                <text v-if="(match.assistantIds || []).includes(r.playerId)" class="tag tag-purple">🛡️</text>
                <text v-if="!r.isTempPlayer && isInTeamA(r.playerId)" class="tag tag-blue">{{(match.teamA?.name || 'A队').replace(/[🔴🔵]/g,'').trim()}}</text>
                <text v-else-if="!r.isTempPlayer && isInTeamB(r.playerId)" class="tag tag-red">{{(match.teamB?.name || 'B队').replace(/[🔴🔵]/g,'').trim()}}</text>
              </view>
            </view>
            <view class="reg-right">
              <text v-if="r.status === 'confirmed' || r.status === 'screenshot_uploaded'" class="status-confirmed">✅</text>
              <text v-else-if="r.status === 'pending_screenshot'" class="status-pending">⏳</text>
              <text v-else-if="r.status === 'cancelled'" class="status-cancelled">❌</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">暂无报名</view>
        
        <view class="btn-group" v-if="!isRegistered && match.status === 'upcoming' && !match.registrationClosed">
          <view class="btn-primary" @click="showRegister">我要报名</view>
        </view>
      </view>
      
      <!-- 赛况 -->
      <view class="card" v-if="match.events && match.events.length > 0">
        <view class="section-title">📊 赛况</view>
        <view class="event-list">
          <view class="event-item" v-for="e in match.events" :key="e.id">
            <view class="event-team-bar" :style="{background: getEventTeamColor(e.playerId)}"></view>
            <view class="event-time">{{e.minute}}'</view>
            <view class="event-detail">
              <text v-if="e.type === 'goal'">⚽ {{players[e.playerId]?.nickname}} 进球</text>
              <text v-else-if="e.type === 'assist'">🎯 助攻: {{players[e.playerId]?.nickname}}</text>
              <text v-else-if="e.type === 'yellow'">🟨 {{players[e.playerId]?.nickname}} 黄牌</text>
              <text v-else-if="e.type === 'red'">🟥 {{players[e.playerId]?.nickname}} 红牌</text>
              <text v-else-if="e.type === 'ownGoal' || e.type === 'own_goal'">⚽ {{players[e.playerId]?.nickname}} 乌龙(OG)</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 评分 -->
      <view class="card" v-if="match.status === 'completed' && match.ratingOpen">
        <view class="section-title">⭐ 评分</view>
        <view class="rating-list">
          <view class="rating-item" v-for="(pid, idx) in confirmedPlayerIds" :key="pid">
            <text>{{players[pid]?.nickname}}</text>
            <text>{{(matchRatings[pid] || 5).toFixed(1)}}</text>
          </view>
        </view>
        <view class="btn-primary" style="margin-top:20rpx" @click="goRate">📝 去评分</view>
      </view>
      
      <!-- MVP -->
      <view class="card" v-if="match.mvp && match.mvp.length > 0">
        <view class="section-title">🏆 MVP</view>
        <view class="mvp-players">
          <view class="mvp-item" v-for="pid in match.mvp" :key="pid">
            <view class="mvp-avatar">{{players[pid]?.nickname?.[0] || '?'}}</view>
            <text class="mvp-name">{{players[pid]?.nickname || '未知'}}</text>
          </view>
        </view>
        <view v-if="isAdmin && match.status === 'completed'" class="admin-mvp-btn" @click="showMVPSelector">
          <text>🏆 指定MVP</text>
        </view>
      </view>
      
      <!-- 贴图/图片分享 -->
      <view class="card">
        <view class="section-header">
          <view class="section-title">🖼️ 贴图</view>
          <view class="section-count">{{posts.length}}张</view>
        </view>
        <view v-if="posts.length === 0" class="empty-posts">
          <text>暂无贴图，点击上传第一张</text>
        </view>
        <view class="post-list" v-else>
          <view class="post-item" v-for="post in posts" :key="post._id">
            <view class="post-header">
              <view class="post-author">
                <view class="avatar-small">{{post.playerName?.[0] || '?'}}</view>
                <text class="post-name">{{post.playerName || '未知'}}</text>
              </view>
              <text class="post-time">{{formatTime(post.createdAt)}}</text>
              <view v-if="isAdmin || post.playerId === currentPlayerId" class="post-delete" @click="deletePost(post._id)">✕</view>
            </view>
            <image class="post-image" :src="post.imageUrl" mode="widthFix" @click="previewImage(post.imageUrl)" />
            <view class="comment-section">
              <view class="comment-list" v-if="post.comments && post.comments.length > 0">
                <view class="comment-item" v-for="comment in post.comments" :key="comment._id">
                  <text class="comment-author">{{comment.playerName || '未知'}}:</text>
                  <text class="comment-content">{{comment.content}}</text>
                  <view v-if="isAdmin || comment.playerId === currentPlayerId" class="comment-delete" @click="deleteComment(comment._id)">✕</view>
                </view>
              </view>
              <view class="comment-input-row">
                <input class="comment-input" v-model="post.commentText" placeholder="写评论..." maxlength="100" />
                <view class="comment-send" @click="sendComment(post)">发送</view>
              </view>
            </view>
          </view>
        </view>
        <view class="btn-secondary" style="margin-top:20rpx" @click="uploadPostImage">📤 上传贴图</view>
      </view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();

export default {
  data() {
    return {
      loading: true,
      matchId: '',
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [], events: [], teamConfirmed: false, registrationClosed: false, ratingOpen: false },
      players: {},
      openid: '',
      isAdmin: false,
      currentPlayerId: '',
      matchRatings: {},
      posts: [],
    };
  },
  computed: {
    statusText() {
      const map = { upcoming: '即将开始', ongoing: '进行中', completed: '已结束' };
      return map[this.match.status] || this.match.status;
    },
    statusClass() {
      const map = { upcoming: 'status-upcoming', ongoing: 'status-ongoing', completed: 'status-completed' };
      return map[this.match.status] || '';
    },
    statusLabel() {
      if (this.match.status === 'upcoming') {
        if (this.match.teamConfirmed) return '已分队';
        if (this.match.registrationClosed) return '已关闭';
        return '报名中';
      }
      if (this.match.status === 'ongoing') return '比赛中';
      if (this.match.status === 'completed') return this.match.ratingOpen ? '评分中' : '已完赛';
      return '';
    },
    isNew() {
      if (!this.match.createdAt) return false;
      let createdAt = this.match.createdAt;
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
      return (now - created) < 24 * 60 * 60 * 1000;
    },
    registrations() {
      return (this.match.registrations || []).map(r => ({
        ...r,
        player: this.players[r.playerId] || {}
      }));
    },
    isRegistered() {
      return this.match.registrations?.some(r => r.playerId === this.currentPlayerId && r.status !== 'cancelled');
    },
    ownerName() {
      return this.players[this.match.ownerId]?.nickname || '待定';
    },
    confirmedPlayerIds() {
      return (this.match.registrations || [])
        .filter(r => r.status === 'confirmed' || r.status === 'screenshot_uploaded')
        .map(r => r.playerId);
    },
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadMatch();
  },
  onShareAppMessage() {
    const title = this.match.title || '比赛';
    const score = this.match.status === 'completed' 
      ? ` (${this.match.teamA.score}-${this.match.teamB.score})`
      : '';
    return {
      title: `${title}${score}`,
      path: `/pages/match/detail?id=${this.matchId}`,
    };
  },
  methods: {
    async loadMatch() {
      this.loading = true;
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' });
        this.openid = loginRes.result.openid;
        this.isAdmin = loginRes.result.isAdmin || false;
        this.currentPlayerId = loginRes.result.playerId || '';

        if (!this.currentPlayerId) {
          this.loading = false;
          uni.showModal({
            title: '⚠️ 尚未注册',
            content: '您还没有注册球员信息，请先注册后再查看场次。',
            confirmText: '去注册',
            cancelText: '返回',
            success: (res) => {
              if (res.confirm) {
                uni.switchTab({ url: '/pages/players/my' });
              } else {
                uni.navigateBack();
              }
            }
          });
          return;
        }

        const { data } = await db.collection('matches').doc(this.matchId).get();
        this.match = data;

        const playerIds = [...new Set([
          ...(data.registrations || []).map(r => r.playerId),
          data.ownerId,
          ...(data.assistantIds || []),
          ...(data.teamA?.players || []),
          ...(data.teamB?.players || []),
          ...(data.events || []).map(e => e.playerId),
          ...(data.lateQuitters || []).map(q => q.playerId)
        ].filter(Boolean))];
        
        if (playerIds.length > 0) {
          try {
            const { result } = await wx.cloud.callFunction({ name: 'getPlayers' });
            const allPlayers = result.players || [];
            allPlayers.forEach(p => { 
              if (playerIds.includes(p._id)) {
                this.players[p._id] = p; 
              }
            });
          } catch (e) {
            console.error('加载球员信息失败', e);
          }
        }
        this.loadPosts();
      } catch (e) {
        console.error('加载失败', e);
      }
      this.loading = false;
    },
    
    showRegister() {
      this.doRegister(this.currentPlayerId);
    },

    async doRegister(playerId) {
      wx.showLoading({ title: '报名中' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'registerMatch',
          data: { action: 'register', matchId: this.matchId, playerId }
        });
        if (result.success) {
          uni.showToast({ title: '报名成功' });
          this.loadMatch();
          if (result.status === 'pending_screenshot') {
            const deadline = this.match.screenshotDeadline ? this.match.screenshotDeadline.replace('T', ' ') : '';
            setTimeout(() => {
              uni.showModal({
                title: '⚠️ 请上传截图',
                content: deadline ? `本场比赛需要抽场截图，请于 ${deadline} 前上传截图完成报名。` : '本场比赛需要抽场截图，请尽快上传截图完成报名。',
                confirmText: '现在上传',
                cancelText: '稍后',
                success: (res) => { if (res.confirm) this.uploadScreenshot(); }
              });
            }, 500);
          }
        } else {
          uni.showToast({ title: result.error || '报名失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: '报名失败', icon: 'none' });
      }
      wx.hideLoading();
    },

    async cancelRegister(playerId) {
      uni.showModal({
        title: '确认退出', content: '确定退出这场比赛的报名？',
        confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' });
            try {
              const { result } = await wx.cloud.callFunction({
                name: 'registerMatch',
                data: { action: 'unregister', matchId: this.matchId, playerId }
              });
              if (result.success) { uni.showToast({ title: '已退出' }); this.loadMatch(); }
              else { uni.showToast({ title: result.error || '退出失败', icon: 'none' }); }
            } catch (e) { uni.showToast({ title: '退出失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async toggleRegistration() {
      const newVal = !this.match.registrationClosed;
      try {
        await db.collection('matches').doc(this.matchId).update({ data: { registrationClosed: newVal } });
        this.match.registrationClosed = newVal;
        uni.showToast({ title: newVal ? '已关闭报名' : '已开启报名' });
      } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
    },

    goEdit() {
      uni.navigateTo({ url: `/pages/match/edit?id=${this.matchId}` });
    },
    goTeamSplit() {
      uni.navigateTo({ url: `/pages/match/teamSplit?id=${this.matchId}` });
    },
    goRecord() {
      uni.navigateTo({ url: `/pages/match/record?id=${this.matchId}` });
    },
    goRate() {
      uni.navigateTo({ url: `/pages/match/rate?id=${this.matchId}` });
    },
    goPlayerDetail(playerId) {
      if (!playerId) return;
      uni.navigateTo({ url: `/pages/players/detail?id=${playerId}` });
    },

    async startMatch() {
      uni.showModal({
        title: '开始比赛', content: '确定开始比赛？',
        confirmColor: '#16a34a',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' });
            try {
              await db.collection('matches').doc(this.matchId).update({ data: { status: 'ongoing' } });
              uni.showToast({ title: '比赛已开始' }); this.loadMatch();
            } catch (e) { uni.showToast({ title: '开始失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async endMatch() {
      uni.showModal({
        title: '结束比赛', content: '确定结束比赛？',
        confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' });
            try {
              await db.collection('matches').doc(this.matchId).update({ data: { status: 'completed' } });
              uni.showToast({ title: '比赛已结束' }); this.loadMatch();
            } catch (e) { uni.showToast({ title: '结束失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async toggleRating() {
      const newVal = !this.match.ratingOpen;
      try {
        wx.showLoading({ title: '处理中' });
        await db.collection('matches').doc(this.matchId).update({ data: { ratingOpen: newVal } });
        this.match.ratingOpen = newVal;
        uni.showToast({ title: newVal ? '评分已开启' : '评分已关闭' });
        if (newVal) {
          try { await wx.cloud.callFunction({ name: 'sendNotification', data: { type: 'rating_open', matchId: this.matchId } }); }
          catch (e) { console.error('评分通知发送失败', e); }
        }
      } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
      wx.hideLoading();
      if (!newVal) {
        wx.showLoading({ title: '计算MVP中' });
        try { await wx.cloud.callFunction({ name: 'recalculateStats' }); uni.showToast({ title: 'MVP已计算' }); this.loadMatch(); }
        catch (e) { console.error('MVP计算失败', e); uni.showToast({ title: 'MVP计算失败', icon: 'none' }); }
        wx.hideLoading();
      }
    },

    async uploadScreenshot() {
      wx.showLoading({ title: '处理中' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'registerMatch', data: { action: 'uploadScreenshot', matchId: this.matchId, playerId: this.currentPlayerId }
        });
        if (result.success) { uni.showToast({ title: '截图上传成功' }); this.loadMatch(); }
        else { uni.showToast({ title: result.error || '上传失败', icon: 'none' }); }
      } catch (e) { uni.showToast({ title: '上传失败', icon: 'none' }); }
      wx.hideLoading();
    },

    async confirmTeam() {
      uni.showModal({
        title: '确认名单', content: '确认后将按优先级排序，超出上限的变为候补。确定？',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' });
            try {
              const { result } = await wx.cloud.callFunction({
                name: 'registerMatch', data: { action: 'confirmTeam', matchId: this.matchId }
              });
              if (result.success) { uni.showToast({ title: '已确认名单' }); this.loadMatch(); }
              else { uni.showToast({ title: result.error || '确认失败', icon: 'none' }); }
            } catch (e) { uni.showToast({ title: '确认失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async deleteMatch() {
      uni.showModal({
        title: '删除场次', content: '确定删除该场次？删除后不可恢复。',
        confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '删除中' });
            try { await db.collection('matches').doc(this.matchId).remove(); uni.showToast({ title: '已删除' }); uni.navigateBack(); }
            catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async changeOwner() {
      const available = this.registrations.filter(r => r.playerId && r.playerId !== this.match.ownerId);
      if (available.length === 0) { uni.showToast({ title: '暂无报名人员', icon: 'none' }); return; }
      const items = available.map(r => r.player?.nickname || '未知');
      uni.showActionSheet({
        itemList: items.slice(0, 6),
        success: async (res) => {
          try {
            const playerId = available[res.tapIndex].playerId;
            await wx.cloud.callFunction({
              name: 'updateMatch', data: { matchId: this.matchId, updateData: { ownerId: playerId } }
            });
            uni.showToast({ title: '场主设定成功' }); this.loadMatch();
          } catch (e) { uni.showToast({ title: '设定失败', icon: 'none' }); }
        }
      });
    },

    async addAssistant() {
      const currentIds = this.match?.assistantIds || [];
      if (currentIds.length >= 4) { uni.showToast({ title: '护法最多4人', icon: 'none' }); return; }
      const available = this.registrations.filter(r => r.playerId && r.playerId !== this.match.ownerId && !currentIds.includes(r.playerId));
      if (available.length === 0) { uni.showToast({ title: '没有可添加的护法人选', icon: 'none' }); return; }
      const items = available.map(r => r.player?.nickname || '未知');
      uni.showActionSheet({
        itemList: items.slice(0, 6),
        success: async (res) => {
          try {
            const playerId = available[res.tapIndex].playerId;
            const newIds = [...currentIds, playerId];
            await wx.cloud.callFunction({
              name: 'updateMatch', data: { matchId: this.matchId, updateData: { assistantIds: newIds, assistantId: newIds[0] } }
            });
            uni.showToast({ title: '护法添加成功' }); this.loadMatch();
          } catch (e) { uni.showToast({ title: '添加失败', icon: 'none' }); }
        }
      });
    },

    async removeAssistant(playerId) {
      uni.showModal({
        title: '确认移除', content: '确定移除该护法？', confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            try {
              const newIds = (this.match?.assistantIds || []).filter(id => id !== playerId);
              await wx.cloud.callFunction({
                name: 'updateMatch', data: { matchId: this.matchId, updateData: { assistantIds: newIds, assistantId: newIds[0] || '' } }
              });
              uni.showToast({ title: '已移除' }); this.loadMatch();
            } catch (e) { uni.showToast({ title: '移除失败', icon: 'none' }); }
          }
        }
      });
    },

    async testNotify(type) {
      try {
        await wx.cloud.callFunction({
          name: 'sendNotification', data: { type, matchId: this.matchId, test: true }
        });
        uni.showToast({ title: '已发送测试' });
      } catch (e) { uni.showToast({ title: '发送失败', icon: 'none' }); }
    },

    isInTeamA(playerId) { return (this.match.teamA?.players || []).includes(playerId); },
    isInTeamB(playerId) { return (this.match.teamB?.players || []).includes(playerId); },
    getEventTeamColor(playerId) {
      if (this.isInTeamA(playerId)) return this.match.teamA?.color || '#3b82f6';
      if (this.isInTeamB(playerId)) return this.match.teamB?.color || '#ef4444';
      return '#999';
    },
    formatTime(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getMonth()+1}月${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
    },
    
    async loadPosts() {
      try { const { result } = await wx.cloud.callFunction({ name: 'getPosts', data: { matchId: this.matchId } }); this.posts = result.posts || []; }
      catch (e) { console.error('加载贴图失败', e); }
    },
    
    async uploadPostImage() {
      uni.chooseImage({
        count: 1, sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          wx.showLoading({ title: '上传中' });
          try {
            const tempFilePath = res.tempFilePaths[0];
            const cloudPath = `posts/${this.matchId}/${Date.now()}.jpg`;
            const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
            await wx.cloud.callFunction({ name: 'createPost', data: { matchId: this.matchId, imageUrl: uploadRes.fileID } });
            uni.showToast({ title: '上传成功' }); this.loadPosts();
          } catch (e) { uni.showToast({ title: '上传失败', icon: 'none' }); }
          wx.hideLoading();
        }
      });
    },
    
    async deletePost(postId) {
      uni.showModal({
        title: '确认删除', content: '确定删除这张贴图？', confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            try { await wx.cloud.callFunction({ name: 'deletePost', data: { postId } }); uni.showToast({ title: '已删除' }); this.loadPosts(); }
            catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
          }
        }
      });
    },
    
    async sendComment(post) {
      if (!post.commentText || !post.commentText.trim()) return;
      try {
        await wx.cloud.callFunction({ name: 'addComment', data: { postId: post._id, content: post.commentText.trim() } });
        post.commentText = ''; this.loadPosts();
      } catch (e) { uni.showToast({ title: '评论失败', icon: 'none' }); }
    },
    
    async deleteComment(commentId) {
      try { await wx.cloud.callFunction({ name: 'deleteComment', data: { commentId } }); this.loadPosts(); }
      catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
    },
    
    previewImage(url) { uni.previewImage({ urls: [url] }); },
    
    async showMVPSelector() {
      const confirmed = (this.match.registrations || []).filter(r => r.status === 'confirmed' || r.status === 'screenshot_uploaded').map(r => r.playerId);
      if (confirmed.length === 0) { uni.showToast({ title: '暂无已确认球员', icon: 'none' }); return; }
      const items = confirmed.map(pid => this.players[pid]?.nickname || '未知');
      const ids = confirmed;
      uni.showActionSheet({
        itemList: items.slice(0, 6),
        success: async (res) => {
          try { await db.collection('matches').doc(this.matchId).update({ data: { mvp: [ids[res.tapIndex]] } }); uni.showToast({ title: 'MVP 已指定' }); this.loadMatch(); }
          catch (e) { uni.showToast({ title: '指定失败', icon: 'none' }); }
        }
      });
    }
  }
};
</script>

<style scoped>
.container { padding: 20rpx; background: #f8fafc; min-height: 100vh; }
.loading { text-align: center; padding: 120rpx 0; }
.loading-spinner { font-size: 80rpx; margin-bottom: 20rpx; }
.loading-text { font-size: 28rpx; color: #94a3b8; }

.card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); position: relative; overflow: hidden; }
.card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4rpx; background: linear-gradient(90deg, #3b82f6, #60a5fa); }

.section-title { font-size: 32rpx; font-weight: 700; color: #1e293b; margin-bottom: 20rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-count { font-size: 26rpx; color: #94a3b8; font-weight: 600; }

.match-header { display: flex; justify-content: space-between; align-items: flex-start; }
.match-title { font-size: 34rpx; font-weight: 800; color: #1e293b; margin-bottom: 8rpx; }
.match-info { font-size: 26rpx; color: #64748b; margin-top: 4rpx; font-weight: 500; }
.match-deadline { font-size: 24rpx; color: #f97316; margin-top: 8rpx; font-weight: 600; }
.match-right { text-align: right; flex-shrink: 0; margin-left: 20rpx; }

.status-tag { display: inline-block; padding: 8rpx 16rpx; border-radius: 10rpx; font-size: 24rpx; font-weight: 700; }
.status-upcoming { background: linear-gradient(135deg, #dbeafe, #eff6ff); color: #1e40af; }
.status-ongoing { background: linear-gradient(135deg, #fef3c7, #fef9c8); color: #92400e; }
.status-completed { background: linear-gradient(135deg, #dcfce7, #f0fdf4); color: #166534; }

.match-result { display: flex; align-items: center; justify-content: center; margin-top: 20rpx; padding: 24rpx; background: linear-gradient(135deg, #f8fafc, #f0f9ff); border-radius: 16rpx; gap: 12rpx; }
.team-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; min-width: 0; }
.team { display: flex; align-items: center; gap: 12rpx; width: 100%; }
.team-a { justify-content: flex-start; }
.team-b { justify-content: flex-end; }
.team-dot { width: 28rpx; height: 28rpx; border-radius: 50%; flex-shrink: 0; border: 3rpx solid #fff; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15); }
.team-color-name { font-size: 28rpx; font-weight: 700; color: #374151; }
.team-score { font-size: 44rpx; font-weight: 900; color: #1e293b; }
.vs { font-size: 28rpx; font-weight: 800; color: #94a3b8; flex-shrink: 0; padding: 8rpx 12rpx; background: #f1f5f9; border-radius: 10rpx; }

.new-badge { display: inline-block; background: #ef4444; color: #fff; font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 8rpx; font-weight: 700; vertical-align: middle; }

.btn-group { display: flex; gap: 16rpx; margin-top: 20rpx; }
.btn-primary { flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-align: center; padding: 24rpx 0; border-radius: 12rpx; font-size: 30rpx; font-weight: 700; }
.btn-secondary { flex: 1; background: #f1f5f9; color: #475569; text-align: center; padding: 20rpx 0; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; }

/* 管理员操作 */
.admin-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.admin-btn { display: flex; flex-direction: column; align-items: center; padding: 16rpx 0; background: #f8fafc; border-radius: 12rpx; gap: 6rpx; }
.admin-icon { font-size: 32rpx; }
.admin-label { font-size: 22rpx; color: #475569; font-weight: 600; }

/* 消息测试 */
.test-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.test-btn { background: #fff; border-radius: 12rpx; padding: 16rpx 0; text-align: center; font-size: 22rpx; color: #475569; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.05); font-weight: 600; }

/* 场主/护法 */
.owner-item { display: flex; align-items: center; gap: 16rpx; padding: 14rpx 0; border-bottom: 2rpx solid #f1f5f9; }
.owner-item:last-child { border-bottom: none; }
.owner-label { font-size: 24rpx; color: #94a3b8; width: 80rpx; font-weight: 600; }
.owner-name { font-size: 28rpx; color: #1e293b; flex: 1; font-weight: 600; }
.owner-action { font-size: 24rpx; color: #3b82f6; padding: 8rpx 18rpx; background: #eff6ff; border-radius: 10rpx; font-weight: 600; }

/* 报名接龙 */
.reg-list { }
.reg-item { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 2rpx solid #f1f5f9; }
.reg-item:last-child { border-bottom: none; }
.reg-info { flex: 1; min-width: 0; }
.reg-name-row { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.reg-tags { display: flex; gap: 6rpx; margin-top: 4rpx; flex-wrap: wrap; }
.reg-right { flex-shrink: 0; }

.player-name-link { display: inline-block; color: #1e40af; cursor: pointer; font-weight: 600; }
.player-name-link:active { color: #3b82f6; }
.temp-tag { font-size: 24rpx; }
.ktt-tag { font-size: 22rpx; color: #94a3b8; }
.tag { display: inline-flex; align-items: center; padding: 4rpx 10rpx; border-radius: 8rpx; font-size: 20rpx; font-weight: 600; }
.tag-gray { background: #f1f5f9; color: #64748b; }
.tag-yellow { background: #fef3c7; color: #92400e; }
.tag-purple { background: #ede9fe; color: #5b21b6; }
.tag-blue { background: #dbeafe; color: #1e40af; }
.tag-red { background: #fee2e2; color: #991b1b; }

.status-confirmed { color: #16a34a; font-size: 24rpx; }
.status-pending { color: #f59e0b; font-size: 24rpx; }
.status-cancelled { color: #94a3b8; font-size: 24rpx; }

.empty-state { text-align: center; padding: 40rpx 0; color: #94a3b8; font-size: 28rpx; }

/* 赛况 */
.event-list { }
.event-item { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0; }
.event-team-bar { width: 6rpx; height: 40rpx; border-radius: 3rpx; }
.event-time { font-size: 24rpx; color: #94a3b8; width: 60rpx; font-weight: 600; }
.event-detail { font-size: 28rpx; color: #1e293b; }

/* 评分 */
.rating-list { }
.rating-item { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 2rpx solid #f1f5f9; }

/* MVP */
.mvp-players { display: flex; gap: 16rpx; flex-wrap: wrap; }
.mvp-item { display: flex; align-items: center; gap: 10rpx; background: linear-gradient(135deg, #fefce8, #fef9c3); padding: 12rpx 20rpx; border-radius: 12rpx; }
.mvp-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: linear-gradient(135deg, #eab308, #fbbf24); display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 800; color: #fff; }
.mvp-name { font-size: 28rpx; font-weight: 700; color: #854d0e; }
.admin-mvp-btn { margin-top: 16rpx; padding: 16rpx 0; text-align: center; background: linear-gradient(135deg, #fefce8, #fef9c3); border-radius: 12rpx; font-size: 28rpx; font-weight: 700; color: #eab308; }

/* 贴图 */
.empty-posts { text-align: center; padding: 40rpx 0; color: #94a3b8; font-size: 26rpx; }
.post-list { display: flex; flex-direction: column; gap: 24rpx; }
.post-item { background: #f8fafc; border-radius: 16rpx; padding: 20rpx; }
.post-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.post-author { display: flex; align-items: center; gap: 10rpx; flex: 1; }
.avatar-small { width: 48rpx; height: 48rpx; border-radius: 50%; background: linear-gradient(135deg, #dcfce7, #bbf7d0); display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; color: #166534; }
.post-name { font-size: 28rpx; font-weight: 700; color: #1e293b; }
.post-time { font-size: 22rpx; color: #94a3b8; }
.post-delete { width: 40rpx; height: 40rpx; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; margin-left: auto; }
.post-image { width: 100%; border-radius: 12rpx; margin-bottom: 16rpx; }
.comment-section { margin-top: 12rpx; }
.comment-list { display: flex; flex-direction: column; gap: 10rpx; margin-bottom: 12rpx; }
.comment-item { display: flex; align-items: flex-start; gap: 8rpx; font-size: 26rpx; padding: 10rpx 14rpx; background: #fff; border-radius: 10rpx; }
.comment-author { font-weight: 700; color: #475569; flex-shrink: 0; }
.comment-content { color: #334155; flex: 1; word-break: break-all; }
.comment-delete { color: #dc2626; font-size: 22rpx; padding: 4rpx 8rpx; }
.comment-input-row { display: flex; gap: 12rpx; align-items: center; }
.comment-input { flex: 1; height: 64rpx; background: #fff; border-radius: 12rpx; padding: 0 16rpx; font-size: 26rpx; border: 2rpx solid #e2e8f0; }
.comment-send { background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; padding: 14rpx 28rpx; border-radius: 12rpx; font-size: 26rpx; font-weight: 700; }
</style>
