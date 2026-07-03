<template>
  <view class="container">
    <view class="overview">
      <view class="overview-card">
        <view class="overview-num">{{completedMatches.length}}</view>
        <view class="overview-label">已结束场次</view>
      </view>
      <view class="overview-card">
        <view class="overview-num">{{totalGoals}}</view>
        <view class="overview-label">总进球数</view>
      </view>
    </view>

    <view class="card" v-for="section in sections" :key="section.key">
      <view class="section-header" @click="toggleCollapse(section.key)">
        <view class="section-title">{{section.icon}} {{section.title}}</view>
        <text class="collapse-arrow">{{collapsed[section.key] ? '▼' : '▲'}}</text>
      </view>
      <view v-if="!collapsed[section.key]">
        <view class="rank-item" v-for="(p, i) in section.data" :key="p._id">
          <text class="rank-num" :class="i < 3 ? 'top' : ''">{{i + 1}}</text>
          <view class="avatar">{{p.nickname[0]}}</view>
          <view class="rank-info">
            <view class="rank-name">{{p.nickname}}</view>
            <view class="rank-meta" v-if="section.meta">{{section.meta(p)}}</view>
          </view>
          <view class="rank-score">{{section.score(p)}}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();
export default {
  data() {
    return {
      players: [],
      completedMatches: [],
      collapsed: {
        scorers: false,
        assists: false,
        mvp: false,
        owners: false,
        assistants: false,
        rated: false
      }
    }
  },
  onShow() {
    this.loadData();
  },
  computed: {
    totalGoals() {
      return this.completedMatches.reduce((s, m) => s + (m.teamA?.score || 0) + (m.teamB?.score || 0), 0);
    },
    topScorers() {
      return [...this.players].sort((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0)).slice(0, 10);
    },
    topAssists() {
      return [...this.players].sort((a, b) => (b.stats?.assists || 0) - (a.stats?.assists || 0)).slice(0, 10);
    },
    topMVP() {
      return [...this.players].sort((a, b) => (b.stats?.mvp || 0) - (a.stats?.mvp || 0)).slice(0, 10);
    },
    topOwners() {
      return [...this.players].sort((a, b) => (b.stats?.ownerCount || 0) - (a.stats?.ownerCount || 0)).slice(0, 10);
    },
    topAssistants() {
      return [...this.players].sort((a, b) => (b.stats?.assistantCount || 0) - (a.stats?.assistantCount || 0)).slice(0, 10);
    },
    topRated() {
      return [...this.players]
        .filter(p => p.allowRating !== false)
        .sort((a, b) => (b.stats?.rating || 5) - (a.stats?.rating || 5))
        .slice(0, 10);
    },
    sections() {
      return [
        { key: 'scorers', icon: '🏆', title: '射手榜', data: this.topScorers, score: p => p.stats?.goals || 0, meta: p => `出场 ${p.stats?.appearances || 0}` },
        { key: 'assists', icon: '🤝', title: '助攻榜', data: this.topAssists, score: p => p.stats?.assists || 0 },
        { key: 'mvp', icon: '⭐', title: 'MVP榜', data: this.topMVP, score: p => p.stats?.mvp || 0 },
        { key: 'owners', icon: '👑', title: '场主榜', data: this.topOwners, score: p => p.stats?.ownerCount || 0 },
        { key: 'assistants', icon: '🛡️', title: '护法榜', data: this.topAssistants, score: p => p.stats?.assistantCount || 0 },
        { key: 'rated', icon: '⭐', title: '评分榜', data: this.topRated, score: p => (p.stats?.rating || 5).toFixed(1) },
      ];
    }
  },
  methods: {
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        const playersRes = await db.collection('players').get();
        const matchesRes = await db.collection('matches').where({ status: 'completed' }).get();
        this.players = playersRes.data;
        this.completedMatches = matchesRes.data;
      } catch (e) {
        console.error('加载失败', e);
      }
      wx.hideLoading();
    },
    toggleCollapse(key) {
      this.collapsed[key] = !this.collapsed[key];
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; padding-bottom: 40rpx; }
.overview { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin-bottom: 20rpx; }
.overview-card { background: #fff; border-radius: 16rpx; padding: 32rpx; text-align: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.overview-num { font-size: 48rpx; font-weight: 700; color: #16a34a; }
.overview-label { font-size: 26rpx; color: #6b7280; margin-top: 8rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; cursor: pointer; }
.section-title { font-size: 30rpx; font-weight: 700; }
.collapse-arrow { font-size: 28rpx; color: #9ca3af; }
.rank-item { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.rank-item:last-child { border-bottom: none; }
.rank-num { width: 48rpx; font-size: 28rpx; font-weight: 700; color: #9ca3af; text-align: center; }
.rank-num.top { color: #16a34a; }
.avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #dcfce7; color: #166534; font-weight: 700; font-size: 28rpx; display: flex; align-items: center; justify-content: center; margin-right: 16rpx; }
.rank-info { flex: 1; }
.rank-name { font-size: 30rpx; font-weight: 600; }
.rank-meta { font-size: 24rpx; color: #9ca3af; margin-top: 4rpx; }
.rank-score { font-size: 36rpx; font-weight: 700; color: #111827; }
</style>
