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
      goalMap: {},
      assistMap: {},
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
      return [...this.players]
        .filter(p => !p._id.startsWith('temp_'))
        .map(p => ({ ...p, _liveGoals: this.goalMap[p._id] || 0 }))
        .sort((a, b) => b._liveGoals - a._liveGoals)
        .slice(0, 10);
    },
    topAssists() {
      return [...this.players]
        .map(p => ({ ...p, _liveAssists: this.assistMap[p._id] || 0 }))
        .filter(p => p._liveAssists > 0)
        .sort((a, b) => b._liveAssists - a._liveAssists)
        .slice(0, 10);
    },
    topMVP() {
      return [...this.players].filter(p => !p._id.startsWith('temp_')).sort((a, b) => (b.stats?.mvp || 0) - (a.stats?.mvp || 0)).slice(0, 10);
    },
    topOwners() {
      const ownerMap = {};
      for (const m of this.completedMatches) {
        if (m.ownerId) ownerMap[m.ownerId] = (ownerMap[m.ownerId] || 0) + 1;
      }
      return [...this.players]
        .filter(p => !p._id.startsWith('temp_'))
        .map(p => ({ ...p, _liveOwnerCount: ownerMap[p._id] || 0 }))
        .filter(p => p._liveOwnerCount > 0)
        .sort((a, b) => b._liveOwnerCount - a._liveOwnerCount)
        .slice(0, 10);
    },
    topAssistants() {
      const assistantMap = {};
      for (const m of this.completedMatches) {
        for (const aid of (m.assistantIds || [])) {
          if (aid) assistantMap[aid] = (assistantMap[aid] || 0) + 1;
        }
      }
      return [...this.players]
        .filter(p => !p._id.startsWith('temp_'))
        .map(p => ({ ...p, _liveAssistantCount: assistantMap[p._id] || 0 }))
        .filter(p => p._liveAssistantCount > 0)
        .sort((a, b) => b._liveAssistantCount - a._liveAssistantCount)
        .slice(0, 10);
    },
    topRated() {
      return [...this.players]
        .filter(p => p.allowRating !== false && !p._id.startsWith('temp_'))
        .map(p => {
          const playerMatches = this.completedMatches.filter(m => {
            const inA = (m.teamA?.players || []).includes(p._id);
            const inB = (m.teamB?.players || []).includes(p._id);
            return inA || inB;
          });
          const rating = this.calculatePlayerRating(p, playerMatches);
          return { 
            ...p, 
            _peerAvg: rating.peerAvg, 
            _adminAvg: rating.adminAvg, 
            _performanceRating: rating.performanceRating, 
            _compositeRating: rating.compositeRating 
          };
        })
        .sort((a, b) => b._compositeRating - a._compositeRating)
        .slice(0, 10);
    },
    sections() {
      return [
        { key: 'scorers', icon: '🏆', title: '射手榜', data: this.topScorers, score: p => p._liveGoals || 0, meta: p => `出场 ${p.stats?.appearances || 0}` },
        { key: 'assists', icon: '🤝', title: '助攻榜', data: this.topAssists, score: p => p._liveAssists || 0 },
        { key: 'mvp', icon: '⭐', title: 'MVP榜', data: this.topMVP, score: p => p.stats?.mvp || 0 },
        { key: 'owners', icon: '👑', title: '场主榜', data: this.topOwners, score: p => p._liveOwnerCount || 0 },
        { key: 'assistants', icon: '🛡️', title: '护法榜', data: this.topAssistants, score: p => p._liveAssistantCount || 0 },
        { key: 'rated', icon: '⭐', title: '评分榜', data: this.topRated, score: p => (p._compositeRating || 5).toFixed(1) },
      ];
    }
  },
  methods: {
    calculatePlayerRating(player, completedMatches) {
      const playerId = player._id;
      const FRONT_POSITIONS = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'];
      const BACK_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM'];
      
      let winPoints = 0, teamMatches = 0, yellowCount = 0, redCount = 0;
      let goals = 0, assists = 0;

      for (const m of completedMatches) {
        const inTeamA = (m.teamA?.players || []).includes(playerId);
        const inTeamB = (m.teamB?.players || []).includes(playerId);
        if (!inTeamA && !inTeamB) continue;

        teamMatches++;
        const aScore = m.teamA?.score || 0;
        const bScore = m.teamB?.score || 0;
        if (inTeamA) {
          if (aScore > bScore) winPoints += 3;
          else if (aScore === bScore) winPoints += 1;
        } else {
          if (bScore > aScore) winPoints += 3;
          else if (bScore === aScore) winPoints += 1;
        }

        for (const e of (m.events || [])) {
          if (e.playerId === playerId) {
            if (e.type === 'goal') goals++;
            if (e.type === 'yellow') yellowCount++;
            if (e.type === 'red') redCount++;
          }
          if (e.type === 'goal' && e.assistById === playerId) {
            assists++;
          }
          if (e.type === 'assist' && e.playerId === playerId) {
            assists++;
          }
        }
      }

      const isFront = player.positions?.some(pos => FRONT_POSITIONS.includes(pos));
      const isBack = player.positions?.some(pos => BACK_POSITIONS.includes(pos));

      let performanceRating = 5;
      if (teamMatches > 0) {
        const winRate = winPoints / (teamMatches * 3);
        const goalRate = Math.min(goals / teamMatches, 2);
        const assistRate = Math.min(assists / teamMatches, 2);
        const cardPenalty = (redCount * 1 + yellowCount * 0.3) / teamMatches;

        if (isFront) {
          performanceRating = 5 + winRate * 2 + goalRate * 1.5 + assistRate * 1 - cardPenalty;
        } else if (isBack) {
          performanceRating = 5 + winRate * 3 - cardPenalty * 0.5;
        } else {
          performanceRating = 5 + winRate * 2 + goalRate * 1 + assistRate * 0.5 - cardPenalty;
        }
        performanceRating = Math.min(10, Math.max(1, Math.round(performanceRating * 10) / 10));
      }

      const validMatchIds = new Set(completedMatches.map(m => m._id));
      const ratings = player.ratings || {};
      const peerRatings = (ratings.peerRatings || []).filter(r => validMatchIds.has(r.matchId));
      const adminRatings = (ratings.adminRatings || []).filter(r => validMatchIds.has(r.matchId));
      const initialRating = (typeof ratings.initialRating === 'number') ? ratings.initialRating : 5;

      const peerAvg = peerRatings.length > 0
        ? peerRatings.reduce((s, r) => s + r.score, 0) / peerRatings.length
        : initialRating;
      const adminAvg = adminRatings.length > 0
        ? adminRatings.reduce((s, r) => s + r.score, 0) / adminRatings.length
        : initialRating;

      let compositeRating = peerAvg * 0.5 + adminAvg * 0.3 + performanceRating * 0.2;
      compositeRating = Math.min(10, Math.max(1, Math.round(compositeRating * 10) / 10));

      return {
        compositeRating,
        peerAvg,
        adminAvg,
        performanceRating,
        teamMatches,
        winPoints,
        goals,
        assists,
        yellowCount,
        redCount,
        peerCount: peerRatings.length,
        adminCount: adminRatings.length
      };
    },
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        const { result: playerResult } = await wx.cloud.callFunction({ name: 'getPlayers' });
        this.players = playerResult.players || [];
        const LIMIT = 100;
        let completedMatches = [];
        let skip = 0;
        while (true) {
          const { data } = await db.collection('matches').where({ status: 'completed' }).limit(LIMIT).skip(skip).get();
          if (data.length === 0) break;
          completedMatches = completedMatches.concat(data);
          if (data.length < LIMIT) break;
          skip += LIMIT;
        }
        this.completedMatches = completedMatches;

        const goalMap = {};
        const assistMap = {};
        for (const m of this.completedMatches) {
          for (const e of (m.events || [])) {
            if (e.type === 'goal' && e.playerId) {
              goalMap[e.playerId] = (goalMap[e.playerId] || 0) + 1;
            }
            if (e.type === 'goal' && e.assistById) {
              assistMap[e.assistById] = (assistMap[e.assistById] || 0) + 1;
            }
            if (e.type === 'assist' && e.playerId) {
              assistMap[e.playerId] = (assistMap[e.playerId] || 0) + 1;
            }
          }
        }
        this.goalMap = goalMap;
        this.assistMap = assistMap;
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
