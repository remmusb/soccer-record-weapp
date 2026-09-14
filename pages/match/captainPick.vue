<template>
  <view class="container">
    <view v-if="loading" class="loading">
      <view class="loading-spinner">⚽</view>
      <view class="loading-text">加载中...</view>
    </view>
    
    <view v-else-if="!isCaptain" class="card error-card">
      <text class="error-icon">🚫</text>
      <text class="error-text">您不是本场队长，无法参与选人</text>
    </view>
    
    <view v-else class="match-detail">
      <!-- 选人状态 -->
      <view class="card status-card">
        <view class="status-title">🏆 队长选人</view>
        <view class="status-mode">模式：{{pickOrderText}}</view>
        <view class="status-turn" :class="{'my-turn': isMyTurn}">
          <text v-if="isMyTurn">🎯 轮到您选人了！</text>
          <text v-else>⏳ 等待对方队长选人...</text>
        </view>
        <view class="status-progress">已选 {{pickedCount}}/{{totalCount}} 人</view>
      </view>
      
      <!-- 两队 -->
      <view class="teams">
        <view class="team team-a" :class="{'active-turn': currentPicker === 'A'}">
          <view class="team-header">
            <view class="team-title">{{match.teamA?.name || 'A队'}}</view>
            <view class="team-captain" v-if="captainA">👑 {{players[captainA]?.nickname}}</view>
          </view>
          <view class="team-count">{{teamA.length}} 人</view>
          <view class="team-list">
            <view class="team-player" v-for="p in teamA" :key="p._id">
              <image v-if="p.avatar" :src="p.avatar" mode="aspectFill" class="player-avatar" />
              <view v-else class="player-avatar-placeholder">{{p.nickname[0]}}</view>
              <text class="player-name">{{p.nickname}}</text>
            </view>
          </view>
        </view>
        
        <view class="team team-b" :class="{'active-turn': currentPicker === 'B'}">
          <view class="team-header">
            <view class="team-title">{{match.teamB?.name || 'B队'}}</view>
            <view class="team-captain" v-if="captainB">👑 {{players[captainB]?.nickname}}</view>
          </view>
          <view class="team-count">{{teamB.length}} 人</view>
          <view class="team-list">
            <view class="team-player" v-for="p in teamB" :key="p._id">
              <image v-if="p.avatar" :src="p.avatar" mode="aspectFill" class="player-avatar" />
              <view v-else class="player-avatar-placeholder">{{p.nickname[0]}}</view>
              <text class="player-name">{{p.nickname}}</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 待选球员 -->
      <view class="card" v-if="unassigned.length > 0">
        <view class="section-title">👤 待选球员（{{unassigned.length}}人）</view>
        <view class="unassigned-list">
          <view class="unassigned-item" v-for="p in unassigned" :key="p._id">
            <view class="player-info">
              <image v-if="p.avatar" :src="p.avatar" mode="aspectFill" class="player-avatar-small" />
              <view v-else class="player-avatar-placeholder-small">{{p.nickname[0]}}</view>
              <view class="player-meta">
                <text class="player-name">{{p.nickname}}</text>
                <text v-if="p.positions?.length" class="player-pos">{{p.positions.join(',')}}</text>
              </view>
            </view>
            <view class="pick-btn-wrap">
              <text v-if="isMyTurn" class="pick-btn" @click="pickPlayer(p._id)">选入{{myTeamName}}</text>
              <text v-else class="pick-btn disabled">等待中</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 选人完成 -->
      <view class="card done-card" v-if="unassigned.length === 0">
        <text class="done-icon">✅</text>
        <text class="done-text">选人已完成！</text>
        <view class="btn-primary" style="margin-top: 20rpx" @click="goBack">返回场次详情</view>
      </view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();

export default {
  data() {
    return {
      matchId: '',
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [] },
      players: {},
      loading: true,
      openid: '',
      myPlayerId: '',
      isCaptain: false,
      myTeam: '', // 'A' or 'B'
      captainA: '',
      captainB: '',
      currentPicker: 'A',
      pickOrder: 'alternate',
      pickCount: 0,
      pollTimer: null,
    }
  },
  computed: {
    pickOrderText() {
      return this.pickOrder === 'alternate' ? 'ABAB 轮流' : 'ABBA 蛇形';
    },
    teamA() {
      if (!this.match) return [];
      return (this.match.teamA?.players || []).map(id => this.players[id]).filter(Boolean);
    },
    teamB() {
      if (!this.match) return [];
      return (this.match.teamB?.players || []).map(id => this.players[id]).filter(Boolean);
    },
    assignedIds() {
      return new Set([
        ...(this.match?.teamA?.players || []),
        ...(this.match?.teamB?.players || [])
      ]);
    },
    allRegistered() {
      if (!this.match) return [];
      return (this.match.registrations || [])
        .filter(r => r.status !== 'cancelled')
        .map(r => this.players[r.playerId])
        .filter(Boolean);
    },
    unassigned() {
      return this.allRegistered.filter(p => !this.assignedIds.has(p._id));
    },
    pickedCount() {
      return this.teamA.length + this.teamB.length;
    },
    totalCount() {
      return this.allRegistered.length;
    },
    isMyTurn() {
      return this.isCaptain && this.currentPicker === this.myTeam;
    },
    myTeamName() {
      return this.myTeam === 'A' ? 'A队' : 'B队';
    }
  },
  onLoad(options) {
    this.matchId = options.id;
    this.init();
  },
  onUnload() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },
  methods: {
    async init() {
      this.loading = true;
      try {
        // 获取当前用户信息
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        this.openid = result.openid;
        this.myPlayerId = result.playerId || '';
        
        await this.loadMatch();
        
        // 判断是否是队长
        const cp = this.match.captainPick || {};
        this.captainA = cp.captainA || '';
        this.captainB = cp.captainB || '';
        this.currentPicker = cp.currentPicker || 'A';
        this.pickOrder = cp.pickOrder || 'alternate';
        this.pickCount = cp.pickCount || 0;
        
        if (this.myPlayerId === this.captainA) {
          this.isCaptain = true;
          this.myTeam = 'A';
        } else if (this.myPlayerId === this.captainB) {
          this.isCaptain = true;
          this.myTeam = 'B';
        }
        
        // 启动轮询
        this.startPolling();
      } catch (e) {
        console.error('初始化失败', e);
      }
      this.loading = false;
    },
    
    async loadMatch() {
      try {
        const { data } = await db.collection('matches').doc(this.matchId).get();
        this.match = {
          teamA: { players: [], score: 0 },
          teamB: { players: [], score: 0 },
          registrations: [],
          ...data
        };
        
        // 加载球员信息
        const playerIds = [...new Set([
          ...(data.registrations || []).map(r => r.playerId),
          ...(data.teamA?.players || []),
          ...(data.teamB?.players || []),
          data.captainPick?.captainA,
          data.captainPick?.captainB
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
            console.error('加载球员失败', e);
          }
        }
        
        // 注入临时球员
        (data.registrations || []).forEach(r => {
          if (r.isTempPlayer || (r.playerId && r.playerId.startsWith('temp_'))) {
            this.players[r.playerId] = {
              _id: r.playerId,
              nickname: r.tempNickname || '临时球员',
              positions: r.tempPositions || [],
              avatar: '',
              stats: { rating: 5 }
            };
          }
        });
        
        // 更新 captainPick 状态
        const cp = this.match.captainPick || {};
        this.captainA = cp.captainA || '';
        this.captainB = cp.captainB || '';
        this.currentPicker = cp.currentPicker || 'A';
        this.pickOrder = cp.pickOrder || 'alternate';
        this.pickCount = cp.pickCount || 0;
      } catch (e) {
        console.error('加载比赛失败', e);
      }
    },
    
    startPolling() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        this.loadMatch();
      }, 3000);
    },
    
    async pickPlayer(playerId) {
      if (!this.isMyTurn) {
        uni.showToast({ title: '还没轮到您', icon: 'none' });
        return;
      }
      
      wx.showLoading({ title: '处理中' });
      try {
        // 更新队伍
        const teamKey = this.currentPicker === 'A' ? 'teamA' : 'teamB';
        const newPlayers = [...(this.match[teamKey]?.players || []), playerId];
        
        // 计算下一个选人者
        const newPickCount = this.pickCount + 1;
        let nextPicker = 'A';
        if (this.pickOrder === 'alternate') {
          nextPicker = this.currentPicker === 'A' ? 'B' : 'A';
        } else {
          // ABBA 蛇形: A→B→B→A→A→B→B→A...
          // 选人序号（从1开始）对应的选人者循环模式
          const pattern = ['A', 'B', 'B', 'A'];
          nextPicker = pattern[newPickCount % 4];
        }
        
        const updateData = {
          [`${teamKey}.players`]: newPlayers,
          'captainPick.currentPicker': nextPicker,
          'captainPick.pickCount': newPickCount,
        };
        
        // 如果选完了，标记完成
        const allRegIds = (this.match.registrations || [])
          .filter(r => r.status !== 'cancelled')
          .map(r => r.playerId);
        const assignedIds = new Set([
          ...(this.match.teamA?.players || []),
          ...(this.match.teamB?.players || []),
          playerId
        ]);
        if (assignedIds.size >= allRegIds.length) {
          updateData['captainPick.status'] = 'done';
        }
        
        const { result } = await wx.cloud.callFunction({
          name: 'updateMatch',
          data: { matchId: this.matchId, updateData }
        });
        
        // 选人全部完成，发送分队通知
        if (updateData['captainPick.status'] === 'done') {
          try {
            await wx.cloud.callFunction({
              name: 'sendNotification',
              data: { type: 'team_split', matchId: this.matchId }
            });
          } catch (e) { console.error('分队通知发送失败', e); }
        }
        
        if (result.success) {
          uni.showToast({ title: '选人成功' });
          await this.loadMatch();
        } else {
          uni.showToast({ title: result.error || '选人失败', icon: 'none' });
        }
      } catch (e) {
        console.error('选人失败', e);
        uni.showToast({ title: '选人失败', icon: 'none' });
      }
      wx.hideLoading();
    },
    
    goBack() {
      uni.navigateBack();
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; padding-bottom: 40rpx; }
.loading { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.loading-spinner { font-size: 64rpx; animation: spin 1s linear infinite; }
.loading-text { font-size: 28rpx; color: #6b7280; margin-top: 16rpx; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.section-title { font-size: 30rpx; font-weight: 700; margin-bottom: 16rpx; }

.error-card { text-align: center; padding: 80rpx 40rpx; }
.error-icon { font-size: 64rpx; display: block; margin-bottom: 20rpx; }
.error-text { font-size: 30rpx; color: #dc2626; font-weight: 700; }

.status-card { text-align: center; }
.status-title { font-size: 36rpx; font-weight: 700; color: #92400e; margin-bottom: 12rpx; }
.status-mode { font-size: 26rpx; color: #6b7280; margin-bottom: 16rpx; }
.status-turn { font-size: 32rpx; font-weight: 700; padding: 16rpx 24rpx; border-radius: 12rpx; margin-bottom: 12rpx; }
.status-turn.my-turn { background: #dcfce7; color: #166534; }
.status-turn:not(.my-turn) { background: #f3f4f6; color: #6b7280; }
.status-progress { font-size: 26rpx; color: #6b7280; }

.teams { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin-bottom: 20rpx; }
.team { border-radius: 16rpx; padding: 20rpx; transition: all 0.3s; }
.team-a { background: #eff6ff; border: 2rpx solid #bfdbfe; }
.team-b { background: #fef2f2; border: 2rpx solid #fecaca; }
.team.active-turn { box-shadow: 0 0 0 4rpx #fbbf24; }
.team-header { text-align: center; margin-bottom: 12rpx; }
.team-title { font-weight: 700; font-size: 30rpx; }
.team-a .team-title { color: #1e40af; }
.team-b .team-title { color: #991b1b; }
.team-captain { font-size: 22rpx; color: #6b7280; margin-top: 4rpx; }
.team-count { text-align: center; font-size: 24rpx; color: #6b7280; margin-bottom: 12rpx; }
.team-list { display: flex; flex-direction: column; gap: 10rpx; }
.team-player { display: flex; align-items: center; gap: 10rpx; background: #fff; padding: 10rpx 12rpx; border-radius: 10rpx; }
.player-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; }
.player-avatar-placeholder { width: 48rpx; height: 48rpx; border-radius: 50%; background: #dcfce7; color: #166534; font-weight: 700; font-size: 22rpx; display: flex; align-items: center; justify-content: center; }
.player-name { font-size: 26rpx; }

.unassigned-list { display: flex; flex-direction: column; gap: 12rpx; }
.unassigned-item { display: flex; justify-content: space-between; align-items: center; background: #f9fafb; padding: 16rpx 20rpx; border-radius: 12rpx; }
.player-info { display: flex; align-items: center; gap: 12rpx; }
.player-avatar-small { width: 56rpx; height: 56rpx; border-radius: 50%; }
.player-avatar-placeholder-small { width: 56rpx; height: 56rpx; border-radius: 50%; background: #dcfce7; color: #166534; font-weight: 700; font-size: 24rpx; display: flex; align-items: center; justify-content: center; }
.player-meta { display: flex; flex-direction: column; }
.player-pos { font-size: 22rpx; color: #9ca3af; }
.pick-btn { background: #16a34a; color: #fff; font-size: 24rpx; font-weight: 700; padding: 10rpx 20rpx; border-radius: 10rpx; }
.pick-btn.disabled { background: #d1d5db; }

.done-card { text-align: center; padding: 60rpx 40rpx; }
.done-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.done-text { font-size: 32rpx; font-weight: 700; color: #16a34a; }

.btn-primary { background: #16a34a; color: #fff; text-align: center; padding: 24rpx 0; border-radius: 12rpx; font-size: 30rpx; font-weight: 700; }
</style>
