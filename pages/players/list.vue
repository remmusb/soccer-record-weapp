<template>
  <view class="container">
    <view class="stats-bar">
      <view class="stats-item">
        <text class="stats-num">{{players.length}}</text>
        <text class="stats-label">球员</text>
      </view>
      <view class="stats-item">
        <text class="stats-num">{{totalAppearances}}</text>
        <text class="stats-label">出场</text>
      </view>
      <view class="stats-item">
        <text class="stats-num">{{totalGoals}}</text>
        <text class="stats-label">进球</text>
      </view>
      <view class="stats-item">
        <text class="stats-num">{{totalAssists}}</text>
        <text class="stats-label">助攻</text>
      </view>
      <view class="stats-item">
        <text class="stats-num">{{totalMVP}}</text>
        <text class="stats-label">MVP</text>
      </view>
    </view>

    <view class="sort-bar">
      <view class="sort-btn" :class="{active: sortBy === 'rating'}" @click="changeSort('rating')">评分</view>
      <view class="sort-btn" :class="{active: sortBy === 'mvp'}" @click="changeSort('mvp')">MVP</view>
      <view class="sort-btn" :class="{active: sortBy === 'appearances'}" @click="changeSort('appearances')">出场</view>
      <view class="sort-btn" :class="{active: sortBy === 'goals'}" @click="changeSort('goals')">进球</view>
      <view class="sort-btn" :class="{active: sortBy === 'assists'}" @click="changeSort('assists')">助攻</view>
    </view>

    <view class="create-bar" @click="goCreate">
      <view class="btn-primary">+ 添加新球员</view>
    </view>

    <view class="player-card" v-for="p in players" :key="p._id" @click="goDetail(p._id)">
      <view class="avatar-wrapper">
        <image v-if="p.avatar" :src="p.avatar" mode="aspectFill" class="avatar-img" />
        <text v-else class="avatar-text">{{p.nickname[0]}}</text>
      </view>
      <view class="info">
        <view class="name-row">
          <text class="name">{{p.nickname}}</text>
          <text v-if="p.stats?.ownerCount > 0" class="tag tag-yellow">👑{{p.stats.ownerCount}}</text>
          <text v-if="p.stats?.assistantCount > 0" class="tag tag-purple">🛡️{{p.stats.assistantCount}}</text>
          <text v-if="p.stats?.mvp > 0" class="tag tag-gold">🏆{{p.stats.mvp}}</text>
        </view>
        <view class="positions">{{getPositions(p)}}</view>
        <view class="stats-row">
          <text class="stats-item">👟 {{p.stats?.appearances || 0}}</text>
          <text class="stats-item">⚽ {{p.stats?.goals || 0}}</text>
          <text class="stats-item">🅰️ {{p.stats?.assists || 0}}</text>
          <text class="stats-item" v-if="p.stats?.yellowCards">🟨 {{p.stats.yellowCards}}</text>
          <text class="stats-item" v-if="p.stats?.redCards">🟥 {{p.stats.redCards}}</text>
          <text class="stats-item" v-if="p.stats?.mvp">🏆 {{p.stats.mvp}}</text>
        </view>
      </view>
      <view class="right-box">
        <view class="rating-num">{{p.stats?.appearances || 0}}</view>
        <view class="rating-label">出场</view>
        <view v-if="isAdmin" class="delete-btn" @click.stop="deletePlayer(p._id)">🗑️</view>
      </view>
    </view>

    <view class="empty" v-if="players.length === 0">
      <view class="empty-icon">👤</view>
      <view class="empty-text">还没有球员，点击上方添加</view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();
const POSITIONS = [
  { id: 'GK', name: '门将' }, { id: 'CB', name: '中后卫' }, { id: 'LB', name: '左后卫' },
  { id: 'RB', name: '右后卫' }, { id: 'CDM', name: '后腰' }, { id: 'CM', name: '中场' },
  { id: 'CAM', name: '前腰' }, { id: 'LW', name: '左边锋' }, { id: 'RW', name: '右边锋' },
  { id: 'ST', name: '前锋' }, { id: 'CF', name: '中锋' },
];
export default {
  data() { return { players: [], isAdmin: false, sortBy: 'rating' } },
  computed: {
    totalAppearances() {
      return this.players.reduce((sum, p) => sum + (p.stats?.appearances || 0), 0);
    },
    totalGoals() {
      return this.players.reduce((sum, p) => sum + (p.stats?.goals || 0), 0);
    },
    totalAssists() {
      return this.players.reduce((sum, p) => sum + (p.stats?.assists || 0), 0);
    },
    totalMVP() {
      return this.players.reduce((sum, p) => sum + (p.stats?.mvp || 0), 0);
    }
  },
  onShow() { this.loadPlayers() },
  methods: {
    changeSort(field) {
      this.sortBy = field;
      this.sortPlayers();
    },
    sortPlayers() {
      const sortMap = {
        rating: (a, b) => (b.stats?.rating || 5) - (a.stats?.rating || 5),
        mvp: (a, b) => (b.stats?.mvp || 0) - (a.stats?.mvp || 0),
        appearances: (a, b) => (b.stats?.appearances || 0) - (a.stats?.appearances || 0),
        goals: (a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0),
        assists: (a, b) => (b.stats?.assists || 0) - (a.stats?.assists || 0)
      };
      this.players.sort(sortMap[this.sortBy] || sortMap.rating);
    },
    async loadPlayers() {
      wx.showLoading({ title: '加载中' });
      try {
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        this.isAdmin = result.isAdmin || false;

        const { result: playerResult } = await wx.cloud.callFunction({ name: 'getPlayers' });
        this.players = (playerResult.players || []);
        this.sortPlayers();
      } catch (e) {
        console.error('加载球员失败', e);
        uni.showToast({ title: '加载失败：' + (e.message || '请检查数据库权限'), icon: 'none', duration: 3000 });
      }
      wx.hideLoading();
    },
    getPositions(p) {
      if (!p.positions) return '';
      return p.positions.map(pos => POSITIONS.find(pt => pt.id === pos)?.name || pos).join(' · ');
    },
    getHistoricalRating(p) {
      if (!p.ratings) return null;
      const peerScores = (p.ratings.peerRatings || []).map(r => r.score);
      const adminScores = (p.ratings.adminRatings || []).map(r => r.score);
      const allScores = [...peerScores, ...adminScores];
      if (allScores.length === 0) return null;
      return (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
    },
    goCreate() { uni.navigateTo({ url: '/pages/players/create' }) },
    goDetail(id) { uni.navigateTo({ url: `/pages/players/detail?id=${id}` }) },
    deletePlayer(playerId) {
      uni.showModal({
        title: '确认删除',
        content: '删除后不可恢复，确定删除该球员？',
        confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '删除中' });
            try {
              const { result } = await wx.cloud.callFunction({
                name: 'deletePlayer',
                data: { playerId }
              });
              if (result.success) {
                uni.showToast({ title: '已删除' });
                this.loadPlayers();
              } else {
                uni.showToast({ title: result.error || '删除失败', icon: 'none' });
              }
            } catch (e) {
              console.error('删除失败', e);
              uni.showToast({ title: '删除失败', icon: 'none' });
            }
            wx.hideLoading();
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; padding-bottom: 40rpx; }
.stats-bar { display: flex; justify-content: space-around; background: linear-gradient(135deg, #1e40af, #3b82f6); border-radius: 16rpx; padding: 24rpx 0; margin-bottom: 20rpx; }
.stats-item { display: flex; flex-direction: column; align-items: center; }
.stats-num { font-size: 40rpx; font-weight: 800; color: #fff; }
.stats-label { font-size: 24rpx; color: #bfdbfe; margin-top: 4rpx; }
.sort-bar { display: flex; gap: 12rpx; margin-bottom: 16rpx; overflow-x: auto; }
.sort-btn { padding: 12rpx 20rpx; border-radius: 12rpx; font-size: 26rpx; font-weight: 600; background: #f0f0f0; color: #666; white-space: nowrap; }
.sort-btn.active { background: linear-gradient(135deg, #1e40af, #3b82f6); color: #fff; }
.create-bar { margin-bottom: 20rpx; }
.player-card {
  display: flex; align-items: center; background: #fff; border-radius: 16rpx;
  padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.avatar-wrapper {
  width: 96rpx; height: 96rpx; border-radius: 50%; background: #dcfce7;
  display: flex; align-items: center; justify-content: center; margin-right: 24rpx; flex-shrink: 0;
  overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; }
.avatar-text { color: #166534; font-weight: 700; font-size: 40rpx; }
.info { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.name { font-size: 34rpx; font-weight: 700; color: #111827; }
.positions { font-size: 24rpx; color: #9ca3af; margin-bottom: 8rpx; }
.stats-row { display: flex; gap: 16rpx; flex-wrap: wrap; }
.stats-row .stats-item { font-size: 26rpx; color: #475569; }
.right-box { display: flex; flex-direction: column; align-items: center; gap: 4rpx; margin-left: 16rpx; }
.rating-num { font-size: 40rpx; font-weight: 800; color: #1e293b; }
.rating-label { font-size: 20rpx; color: #94a3b8; }
.delete-btn { color: #dc2626; font-size: 32rpx; padding: 8rpx; }
.tag { display: inline-flex; align-items: center; padding: 4rpx 10rpx; border-radius: 8rpx; font-size: 20rpx; font-weight: 600; }
.tag-yellow { background: #fef3c7; color: #92400e; }
.tag-purple { background: #ede9fe; color: #5b21b6; }
.tag-gold { background: linear-gradient(135deg, #fefce8, #fef9c3); color: #eab308; }
.empty { text-align: center; padding: 120rpx 40rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #94a3b8; }
</style>
