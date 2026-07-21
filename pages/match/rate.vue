<template>
  <view class="container" v-if="match">
    <view class="card">
      <view class="match-title">{{match.title}}</view>
      <view class="match-meta">赛后评分 · {{match.date}}</view>
    </view>

    <view class="card" v-if="!isRateWindowOpen">
      <view class="no-permission">
        <view class="no-perm-icon">🔒</view>
        <view class="no-perm-title">{{rateWindowStatus}}</view>
        <view class="no-perm-text">评分窗口由管理员手动控制</view>
      </view>
    </view>

    <!-- 队友互评 -->
    <view class="card" v-if="isPlayer && isRateWindowOpen">
      <view class="section-title">🤝 队友互评（24小时有效）</view>
      <view class="rate-list">
        <view class="rate-item" v-for="p in teammates" :key="p._id">
          <view class="rate-info">
            <view class="avatar">{{p.nickname[0]}}</view>
            <view>
              <view class="rate-name">{{p.nickname}}</view>
              <!-- 位置信息已移除 -->
            </view>
          </view>
          <view class="rate-stars">
            <view class="star" v-for="i in 10" :key="i" :class="{'active': (peerScores[p._id] || 0) >= i}" @click="setPeerScore(p._id, i)">
              {{i}}
            </view>
          </view>
          <view class="rate-value">{{peerScores[p._id] || 0}} 分</view>
        </view>
      </view>
    </view>

    <!-- 管理员评分 -->
    <view class="card" v-if="isAdmin && isRateWindowOpen">
      <view class="section-title">👑 管理员评分</view>
      <view class="rate-list">
        <view class="rate-item" v-for="p in allPlayers" :key="p._id">
          <view class="rate-info">
            <view class="avatar">{{p.nickname[0]}}</view>
            <view>
              <view class="rate-name">{{p.nickname}}</view>
              <!-- 位置信息已移除 -->
            </view>
          </view>
          <view class="rate-stars">
            <view class="star" v-for="i in 10" :key="i" :class="{'active': (adminScores[p._id] || 0) >= i}" @click="setAdminScore(p._id, i)">
              {{i}}
            </view>
          </view>
          <view class="rate-value">{{adminScores[p._id] || 0}} 分</view>
        </view>
      </view>
    </view>

    <!-- 互评记录（高级管理员可见） -->
    <view class="card" v-if="isSuperAdmin && allPeerRatings.length > 0">
      <view class="section-header" @click="showPeerRatings = !showPeerRatings">
        <view class="section-title">📋 互评记录</view>
        <text class="collapse-arrow">{{showPeerRatings ? '▲' : '▼'}}</text>
      </view>
      <view v-if="showPeerRatings">
        <view class="peer-rating-summary">共 {{allPeerRatings.length}} 条互评</view>
        <view v-for="group in groupedPeerRatings" :key="group.toId">
          <view class="peer-group-header">👤 {{group.toName}}</view>
          <view class="peer-rating-list">
            <view class="peer-rating-item" v-for="r in group.items" :key="r.fromId">
              <view class="peer-rating-from">{{r.fromName}}</view>
              <text class="peer-rating-arrow">→</text>
              <view class="peer-rating-score">{{r.score}}分</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 无权限提示 -->
    <view class="card" v-if="!isPlayer && !isAdmin">
      <view class="no-permission">
        <view class="no-perm-icon">🔒</view>
        <view class="no-perm-title">无法评分</view>
        <view class="no-perm-text">您不是本场比赛的参赛队员或管理员</view>
      </view>
    </view>

    <view class="btn-primary" v-if="(isPlayer || isAdmin) && isRateWindowOpen" style="margin-top: 20rpx" @click="submit">提交评分</view>
    <view class="submit-summary" v-if="(isPlayer || isAdmin) && isRateWindowOpen">
      已给 {{(isPlayer ? Object.values(peerScores).filter(s => s > 0).length : 0) + (isAdmin ? Object.values(adminScores).filter(s => s > 0).length : 0)}} 人打分
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();
const _ = db.command;

const POSITIONS = [
  { id: 'GK', name: '门将' }, { id: 'CB', name: '中后卫' }, { id: 'LB', name: '左后卫' },
  { id: 'RB', name: '右后卫' }, { id: 'CDM', name: '后腰' }, { id: 'CM', name: '中场' },
  { id: 'CAM', name: '前腰' }, { id: 'LW', name: '左边锋' }, { id: 'RW', name: '右边锋' },
  { id: 'ST', name: '前锋' }, { id: 'CF', name: '中锋' },
];

export default {
  data() {
    return {
      matchId: '',
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [], events: [] },
      players: {},
      openid: '',
      currentPlayerId: '',
      isAdmin: false,
      isSuperAdmin: false,
      peerScores: {},
      adminScores: {},
      // 管理员查看互评记录
      allPeerRatings: [],
      showPeerRatings: false,
    }
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadData();
  },
  computed: {
    allPlayers() {
      if (!this.match) return [];
      // 评分权限以分队名单为准，排除临时球员
      const ids = [...new Set([
        ...(this.match.teamA?.players || []),
        ...(this.match.teamB?.players || [])
      ].filter(id => id && typeof id === 'string' && !id.startsWith('temp_')))].filter(pid => this.players[pid]);
      return ids.map(id => this.players[id]).filter(Boolean);
    },
    teammates() {
      // 只显示允许评分的队友（管理员除外）
      return this.allPlayers.filter(p => p._id !== this.currentPlayerId && p.allowRating !== false && !p._id.startsWith('temp_'));
    },
    isPlayer() {
      // 评分权限以分队名单为准
      const teamPlayers = [...new Set([
        ...(this.match.teamA?.players || []),
        ...(this.match.teamB?.players || [])
      ])];
      return teamPlayers.includes(this.currentPlayerId) && this.currentPlayerId && !this.currentPlayerId.startsWith('temp_');
    },
    isRateWindowOpen() {
      // 评分窗口由管理员控制开关
      return this.match?.ratingOpen === true;
    },
    rateWindowStatus() {
      if (!this.match?.ratingOpen) return '评分窗口已关闭（管理员未开启）';
      return '评分窗口开放中';
    },
    // 按被评人分组的互评记录
    groupedPeerRatings() {
      const groups = {};
      for (const r of this.allPeerRatings) {
        if (!groups[r.toId]) {
          groups[r.toId] = { toId: r.toId, toName: r.toName, items: [] };
        }
        groups[r.toId].items.push(r);
      }
      return Object.values(groups);
    }
  },
  methods: {
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        this.openid = result.openid;
        this.isAdmin = result.isAdmin;
        this.isSuperAdmin = result.isSuperAdmin || false;
        this.currentPlayerId = result.playerId || '';

        const { data } = await db.collection('matches').doc(this.matchId).get();
        this.match = data;
        // 使用数据库中的 _id 作为 matchId，确保与 detail.vue 绝对一致
        this.matchId = data._id || this.matchId;

        // 加载所有 confirmed + pending_screenshot 的注册球员 + 分队球员 + 赛况球员 + 场主/护法
        const playerIds = [...new Set([
          ...((data.registrations || [])
            .filter(r => r.status === 'confirmed' || r.status === 'pending_screenshot')
            .map(r => r.playerId)),
          ...(data.teamA?.players || []),
          ...(data.teamB?.players || []),
          ...((data.events || []).map(e => e.playerId)),
          data.ownerId,
          data.assistantId,
          ...(data.assistantIds || [])
        ].filter(Boolean))];

        if (playerIds.length > 0) {
          // 纯客户端方案：通过 getPlayers 获取所有球员，然后在客户端过滤
          let pList = [];
          try {
            const { result: allPlayersRes } = await wx.cloud.callFunction({ 
              name: 'getPlayers',
              data: { playerIds }
            });
            if (allPlayersRes && allPlayersRes.players) {
              pList = allPlayersRes.players.filter(p => playerIds.includes(p._id));
            }
          } catch (e) {
            console.error('getPlayers 调用失败:', e);
            // 最后回退到客户端查询
            try {
              const { data } = await db.collection('players')
                .where({ _id: _.in(playerIds) })
                .get();
              pList = data || [];
            } catch (e2) {
              console.error('客户端查询也失败:', e2);
            }
          }
          const newPlayers = {};
          pList.forEach(p => { newPlayers[p._id] = p; });
          this.players = newPlayers;

          // 初始化评分对象（加载已有的评分）
          const peerScores = {};
          const adminScores = {};
          for (const p of Object.values(newPlayers)) {
            if (!p._id || p._id === this.currentPlayerId) continue;

            // 队友互评：查找当前用户对该球员的已有评分
            const existingPeer = p.ratings?.peerRatings || [];
            const peerScore = existingPeer
              .filter(r => r.matchId === this.matchId)
              .find(r => r.fromId === this.currentPlayerId);
            peerScores[p._id] = peerScore ? peerScore.score : 0;

            // 管理员评分
            if (this.isAdmin) {
              const existingAdmin = p.ratings?.adminRatings || [];
              const adminScore = existingAdmin
                .filter(r => r.matchId === this.matchId)
                .find(r => r.fromId === this.currentPlayerId);
              adminScores[p._id] = adminScore ? adminScore.score : 0;
            }
          }
          this.peerScores = peerScores;
          this.adminScores = adminScores;

          // 管理员：收集本场比赛所有互评记录（去重：按fromId+toId只保留最新）
          if (this.isAdmin) {
            const peerMap = new Map();
            for (const p of Object.values(newPlayers)) {
              const peerList = p.ratings?.peerRatings || [];
              for (const r of peerList) {
                if (r.matchId === this.matchId && r.fromId && r.score > 0) {
                  const key = r.fromId + '_' + p._id;
                  const existing = peerMap.get(key);
                  if (!existing || (r.createdAt && existing.createdAt && r.createdAt > existing.createdAt)) {
                    peerMap.set(key, {
                      fromId: r.fromId,
                      fromName: newPlayers[r.fromId]?.nickname || '未知',
                      toId: p._id,
                      toName: p.nickname || '未知',
                      score: r.score,
                      createdAt: r.createdAt
                    });
                  }
                }
              }
            }
            // 按被评人(toId)排序，再按评分人(fromId)排序
            const allPeer = Array.from(peerMap.values()).sort((a, b) => {
              if (a.toId !== b.toId) return a.toId.localeCompare(b.toId);
              return a.fromId.localeCompare(b.fromId);
            });
            this.allPeerRatings = allPeer;
          }
        }
      } catch (e) { console.error(e); }
      wx.hideLoading();
    },
    getPositions(p) {
      if (!p?.positions) return '';
      return p.positions.map(pos => POSITIONS.find(pt => pt.id === pos)?.name || pos).join(' ');
    },
    setPeerScore(id, score) {
      this.peerScores = { ...this.peerScores, [id]: score };
    },
    setAdminScore(id, score) {
      this.adminScores = { ...this.adminScores, [id]: score };
    },
    async submit() {
      const peerCount = Object.values(this.peerScores).filter(s => s > 0).length;
      const adminCount = Object.values(this.adminScores).filter(s => s > 0).length;
      const totalCount = peerCount + adminCount;
      
      if (totalCount === 0) {
        uni.showToast({ title: '您没有给任何人打分', icon: 'none' });
        return;
      }
      
      const confirmRes = await new Promise(resolve => {
        uni.showModal({
          title: '确认提交',
          content: `即将提交 ${peerCount} 条队友互评 + ${adminCount} 条管理员评分，共 ${totalCount} 条评分。确认？`,
          success: resolve
        });
      });
      
      if (!confirmRes.confirm) return;
      
      wx.showLoading({ title: '提交中' });
      try {
        // 构建评分数据
        const peerRatings = Object.entries(this.peerScores)
          .filter(([_, score]) => score > 0)
          .map(([pid, score]) => ({ pid, score }));
        const adminRatings = Object.entries(this.adminScores)
          .filter(([_, score]) => score > 0)
          .map(([pid, score]) => ({ pid, score }));

        console.log('提交评分数据:', { matchId: this.matchId, peerRatings, adminRatings, fromId: this.currentPlayerId });

        // 通过云函数提交评分（绕过客户端权限限制）
        const { result } = await wx.cloud.callFunction({
          name: 'submitRating',
          data: {
            matchId: this.matchId,
            peerRatings,
            adminRatings,
            fromId: this.currentPlayerId
          }
        });

        console.log('submitRating 返回:', result);

        if (!result || !result.success) {
          throw new Error(result?.error || '云函数返回失败');
        }

        // 等待数据同步
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 重新计算统计
        await wx.cloud.callFunction({ name: 'recalculateStats' });

        uni.showToast({ title: '评分已提交' });
        setTimeout(() => uni.navigateBack(), 800);
      } catch (e) {
        console.error('提交失败详情:', e);
        uni.showToast({ title: '提交失败: ' + (e.message || e.errMsg || JSON.stringify(e)), icon: 'none', duration: 3000 });
      }
      wx.hideLoading();
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; padding-bottom: 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.match-title { font-size: 34rpx; font-weight: 700; color: #111827; }
.match-meta { font-size: 26rpx; color: #6b7280; margin-top: 8rpx; }
.section-title { font-size: 30rpx; font-weight: 700; margin-bottom: 20rpx; }
.rate-list { display: flex; flex-direction: column; gap: 24rpx; }
.rate-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.rate-info { display: flex; align-items: center; gap: 16rpx; }
.avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #dcfce7; color: #166534; font-weight: 700; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }
.rate-name { font-size: 30rpx; font-weight: 600; }
.rate-pos { font-size: 24rpx; color: #9ca3af; margin-top: 4rpx; }
.rate-stars { display: flex; gap: 8rpx; }
.star { width: 48rpx; height: 48rpx; border-radius: 8rpx; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #9ca3af; }
.star.active { background: #fbbf24; color: #fff; }
.rate-value { font-size: 28rpx; font-weight: 600; color: #16a34a; width: 80rpx; text-align: right; }
.no-permission { text-align: center; padding: 60rpx 40rpx; }
.no-perm-icon { font-size: 64rpx; margin-bottom: 16rpx; }
.no-perm-title { font-size: 32rpx; font-weight: 700; color: #111827; margin-bottom: 8rpx; }
.no-perm-text { font-size: 26rpx; color: #9ca3af; }
.btn-primary { background: #16a34a; color: #fff; border-radius: 16rpx; padding: 28rpx 0; text-align: center; font-weight: 600; font-size: 32rpx; }

.submit-summary { font-size: 26rpx; color: #6b7280; text-align: center; margin-top: 16rpx; }

/* 互评记录 */
.section-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.collapse-arrow { font-size: 28rpx; color: #9ca3af; }
.peer-rating-summary { font-size: 24rpx; color: #6b7280; margin-bottom: 16rpx; }
.peer-group-header { font-size: 28rpx; font-weight: 700; color: #1e293b; padding: 12rpx 0; background: #f1f5f9; margin-top: 8rpx; }
.peer-rating-list { display: flex; flex-direction: column; gap: 12rpx; }
.peer-rating-item { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 16rpx; background: #f8fafc; border-radius: 12rpx; }
.peer-rating-from { font-size: 26rpx; font-weight: 600; color: #1e40af; min-width: 100rpx; }
.peer-rating-arrow { font-size: 24rpx; color: #9ca3af; }
.peer-rating-score { font-size: 28rpx; font-weight: 700; color: #f59e0b; }
</style>
