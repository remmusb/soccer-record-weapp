<template>
  <view class="container" v-if="player">
    <!-- 个人信息 -->
    <view class="card">
      <view class="profile">
        <view class="avatar-wrapper">
          <image v-if="player.avatar" :src="player.avatar" mode="aspectFill" class="avatar-img" />
          <text v-else class="avatar-text">{{player.nickname[0]}}</text>
        </view>
        <view class="profile-info">
          <view class="name">{{player.nickname}} <text v-if="player.allowRating === false" class="no-rating-tag">🚫 不接受队友评分</text></view>
          <view class="real-name">{{player.name}}</view>
          <view class="positions">{{getPositions(player)}}</view>
          <view class="birth-date" v-if="player.birthDate && !player.hideBirthDate">🎂 {{player.birthDate}}</view>
          <view class="ktt-last4" v-if="player.kttLast4">🏷️ 康体通：{{player.kttLast4}}</view>
          <view class="hwf-row" v-if="player.height && !player.hideHeight">📏 身高：{{player.height}}cm</view>
          <view class="hwf-row" v-if="player.weight && !player.hideWeight">⚖️ 体重：{{player.weight}}kg</view>
          <view class="hwf-row" v-if="player.foot && !player.hideFoot">🦶 惯用脚：{{player.foot}}</view>
        </view>
      </view>
    </view>

    <!-- 报名状态 -->
    <view class="card" v-if="registeredMatches.length > 0 || confirmedMatches.length > 0">
      <view class="section-title">📋 我的比赛</view>
      
      <!-- 已接龙（候补或待截图） -->
      <view v-if="registeredMatches.length > 0">
        <view class="sub-title">已接龙</view>
        <view class="match-status-item" v-for="m in registeredMatches" :key="m._id">
          <view class="match-info">
            <view class="history-title">{{m.title}}</view>
            <view class="history-meta">{{m.date}} {{m.time}} · {{m.location || '待定'}}</view>
          </view>
          <view class="status-tag" :class="m._regStatus">
            {{m._regStatus === 'WL' ? '候补' : '待截图'}}
          </view>
        </view>
      </view>
      
      <!-- 成功报名（已确认） -->
      <view v-if="confirmedMatches.length > 0">
        <view class="sub-title">已成功报名</view>
        <view class="match-status-item" v-for="m in confirmedMatches" :key="m._id">
          <view class="match-info">
            <view class="history-title">{{m.title}}</view>
            <view class="history-meta">{{m.date}} {{m.time}} · {{m.location || '待定'}}</view>
            <view class="team-color" v-if="m._teamColor">{{m._teamColor}}</view>
          </view>
          <view class="status-tag confirmed">已确认</view>
        </view>
      </view>
    </view>

    <!-- 综合评分 -->
    <view class="card rating-card">
      <view class="rating-big">
        <view class="rating-number">{{displayRating(player._liveRating?.compositeRating || 5).toFixed(1)}}</view>
        <view class="rating-label">综合评分</view>
      </view>
      <view class="rating-track">
        <view class="rating-fill" :style="{width: (displayRating(player._liveRating?.compositeRating || 5) * 10) + '%'}"></view>
      </view>
      <view class="rating-breakdown">
        <view class="breakdown-item">
          <view class="breakdown-dot" style="background:#3b82f6"></view>
          <view class="breakdown-text">队友互评 {{displayRating(player._liveRating?.peerAvg || 5).toFixed(1)}} × 50%</view>
        </view>
        <view class="breakdown-item">
          <view class="breakdown-dot" style="background:#f59e0b"></view>
          <view class="breakdown-text">系统评分 {{displayRating(player._liveRating?.adminAvg || 5).toFixed(1)}} × 30%</view>
        </view>
        <view class="breakdown-item">
          <view class="breakdown-dot" style="background:#10b981"></view>
          <view class="breakdown-text">比赛表现 {{displayRating(player._liveRating?.performanceRating || 5).toFixed(1)}} × 20%</view>
        </view>
      </view>
      <view v-if="(isAdmin || isSuperAdmin) && player._liveRating" class="admin-raw-rating-btn" @click="showRawRatingModal">
        👁️ 查看原始评分
      </view>
    </view>

    <!-- 原始评分弹窗（管理员专用）-->
    <view class="modal-overlay" v-if="showRawRating" @click="showRawRating = false">
      <view class="modal-popup" @click.stop>
        <view class="modal-header">
          <text class="modal-title">🔍 原始评分</text>
          <text class="modal-close" @click="showRawRating = false">✕</text>
        </view>
        <view class="modal-body" v-if="rawRatingData">
          <view class="raw-rating-row">
            <text class="raw-label">队友互评</text>
            <text class="raw-value">{{rawRatingData.peerAvg?.toFixed(1) || '5.0'}}</text>
          </view>
          <view class="raw-rating-row">
            <text class="raw-label">系统评分</text>
            <text class="raw-value">{{rawRatingData.adminAvg?.toFixed(1) || '5.0'}}</text>
          </view>
          <view class="raw-rating-row">
            <text class="raw-label">比赛表现</text>
            <text class="raw-value">{{rawRatingData.performanceRating?.toFixed(1) || '5.0'}}</text>
          </view>
          <view class="raw-rating-row total">
            <text class="raw-label">综合评分（原始）</text>
            <text class="raw-value">{{rawRatingData.compositeRating?.toFixed(1) || '5.0'}}</text>
          </view>
          <view class="raw-rating-row total">
            <text class="raw-label">综合评分（显示）</text>
            <text class="raw-value">{{displayRating(rawRatingData.compositeRating).toFixed(1)}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 单场原始评分弹窗（管理员专用）-->
    <view class="modal-overlay" v-if="showMatchRawRating" @click="showMatchRawRating = false">
      <view class="modal-popup" @click.stop>
        <view class="modal-header">
          <text class="modal-title">🔍 本场原始评分</text>
          <text class="modal-close" @click="showMatchRawRating = false">✕</text>
        </view>
        <view class="modal-body" v-if="matchRawRatingData">
          <view class="raw-rating-row">
            <text class="raw-label">场次</text>
            <text class="raw-value">{{matchRawRatingData.matchTitle}}</text>
          </view>
          <view class="raw-rating-row">
            <text class="raw-label">原始评分</text>
            <text class="raw-value">{{matchRawRatingData.rawScore?.toFixed(1)}}</text>
          </view>
          <view class="raw-rating-row">
            <text class="raw-label">显示评分</text>
            <text class="raw-value">{{displayRating(matchRawRatingData.rawScore).toFixed(1)}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 所有场次原始评分弹窗（管理员专用）-->
    <view class="modal-overlay" v-if="showAllMatchRawRatingsModal" @click="showAllMatchRawRatingsModal = false">
      <view class="modal-popup" @click.stop>
        <view class="modal-header">
          <text class="modal-title">🔍 参赛历史原始评分</text>
          <text class="modal-close" @click="showAllMatchRawRatingsModal = false">✕</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view v-if="allMatchRawRatingsData.length === 0" class="empty" style="padding:40rpx 0">暂无评分记录</view>
          <view v-for="item in allMatchRawRatingsData" :key="item.matchTitle" class="raw-rating-row">
            <text class="raw-label">{{item.matchTitle}}</text>
            <text class="raw-score">原始: {{item.rawScore?.toFixed(1)}}</text>
            <text class="raw-display">显示: {{item.displayScore?.toFixed(1)}}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 管理员操作 -->
    <view class="card" v-if="isAdmin || isSuperAdmin">
      <view class="section-title">👔 管理员操作</view>
      <view class="admin-action-row">
        <view class="admin-action-btn" @click="editPlayerInfo">📝 编辑球员资料</view>
        <view class="admin-action-btn" @click="editInitialRating">修改初始评分</view>
        <view class="admin-action-btn" @click="editAllowRating">修改评分权限</view>
      </view>
    </view>

    <!-- 生涯数据 -->
    <view class="card">
      <view class="section-header">
        <view class="section-title">📊 生涯数据</view>
        <view class="filter-tabs">
          <view class="filter-tab" :class="{'active': timeFilter === 'all'}" @click="timeFilter = 'all'">全部</view>
          <view class="filter-tab" :class="{'active': timeFilter === 'year'}" @click="timeFilter = 'year'">本年度</view>
          <view class="filter-tab" :class="{'active': timeFilter === 'month'}" @click="timeFilter = 'month'">本月</view>
        </view>
      </view>
      <view class="stats-grid">
        <view class="stat-item"><view class="stat-num">{{filteredStats.appearances || 0}}</view><view class="stat-label">出场</view></view>
        <view class="stat-item"><view class="stat-num">{{filteredStats.goals || 0}}</view><view class="stat-label">进球</view></view>
        <view class="stat-item"><view class="stat-num">{{filteredStats.assists || 0}}</view><view class="stat-label">助攻</view></view>
        <view class="stat-item"><view class="stat-num" style="color:#16a34a">{{filteredStats.wins || 0}}</view><view class="stat-label">胜</view></view>
        <view class="stat-item"><view class="stat-num" style="color:#6b7280">{{filteredStats.draws || 0}}</view><view class="stat-label">平</view></view>
        <view class="stat-item"><view class="stat-num" style="color:#dc2626">{{filteredStats.losses || 0}}</view><view class="stat-label">负</view></view>
        <view class="stat-item"><view class="stat-num" style="color:#ca8a04">{{filteredStats.ownerCount || 0}}</view><view class="stat-label">场主</view></view>
        <view class="stat-item"><view class="stat-num" style="color:#9333ea">{{filteredStats.assistantCount || 0}}</view><view class="stat-label">护法</view></view>
        <view class="stat-item"><view class="stat-num" style="color:#ef4444">{{filteredStats.redCards || 0}}</view><view class="stat-label">红牌</view></view>
      </view>
    </view>

    <!-- 评分历史（仅管理员可见） -->
    <view class="card" v-if="(isAdmin || isSuperAdmin) && filteredRatingHistory.length > 0">
      <view class="section-title">📈 评分历史</view>
      <view class="rating-history">
        <view class="history-row history-header">
          <text>场次</text>
          <text>队友</text>
          <text>管理员</text>
          <text>表现</text>
        </view>
        <view class="history-row" v-for="r in filteredRatingHistory" :key="r.matchId">
          <text class="history-match">{{r.matchTitle}}</text>
          <text :class="{'history-score': true, 'highlight': r.peerScore > 0}">{{r.peerScore || '-'}}</text>
          <text :class="{'history-score': true, 'highlight': r.adminScore > 0}">{{r.adminScore || '-'}}</text>
          <text class="history-score">{{r.performanceScore}}</text>
        </view>
      </view>
    </view>

    <!-- 组织历史 -->
    <view class="card" v-if="filteredOwnerMatches.length > 0 || filteredAssistantMatches.length > 0">
      <view class="section-title">👑 组织历史</view>
      <view v-if="filteredOwnerMatches.length > 0">
        <view class="sub-title">场主</view>
        <view class="history-item" v-for="m in filteredOwnerMatches" :key="m._id">
          <view class="history-title">{{m.title}}</view>
          <view class="history-meta">{{m.date}} {{m.time}}</view>
        </view>
      </view>
      <view v-if="filteredAssistantMatches.length > 0">
        <view class="sub-title">护法</view>
        <view class="history-item" v-for="m in filteredAssistantMatches" :key="m._id">
          <view class="history-title">{{m.title}}</view>
          <view class="history-meta">{{m.date}} {{m.time}}</view>
        </view>
      </view>
    </view>

    <!-- 参赛历史 -->
    <view class="card">
      <view class="section-header">
        <view class="section-title">📅 参赛历史</view>
        <text v-if="(isAdmin || isSuperAdmin) && filteredMatches.length > 0" class="admin-raw-btn" @click="showAllMatchRawRatings">👁️ 查看原始评分</text>
      </view>
      <view class="empty" v-if="filteredMatches.length === 0">暂无{{filterLabel}}参赛记录</view>
      <view class="history-item" v-for="m in filteredMatches" :key="m._id">
        <view>
          <view class="history-title">{{m.title}}</view>
          <view class="history-meta">{{m.date}} {{m.time}} · {{m.location || '待定'}}</view>
          <view class="history-badges">
            <text v-if="getMatchRating(m)" class="badge-rating" :class="{'admin-clickable': isAdmin || isSuperAdmin}" @click.stop="(isAdmin || isSuperAdmin) && showMatchRawRatingFn(m)">⭐{{displayRating(getMatchRating(m)).toFixed(1)}}</text>
          </view>
        </view>
        <view class="history-result" :class="getResultClass(m)">{{getResult(m)}}</view>
      </view>
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
  data() {
    return {
      playerId: '',
      player: null,
      matches: [],
      ownerMatches: [],
      assistantMatches: [],
      ratingHistory: [],
      registeredMatches: [],
      confirmedMatches: [],
      timeFilter: 'all',
      allMatchesData: [],
      isAdmin: false,
      isSuperAdmin: false,
      showRawRating: false,
      rawRatingData: null,
      showMatchRawRating: false,
      matchRawRatingData: null,
      showAllMatchRawRatingsModal: false,
      allMatchRawRatingsData: [],
    }
  },
  onLoad(options) {
    this.playerId = options.id;
    this.loadData();
  },
  computed: {
    filterLabel() {
      return { all: '全部', year: '本年度', month: '本月' }[this.timeFilter];
    },
    filteredMatches() {
      if (!this.matches.length) return [];
      const now = new Date();
      return this.matches.filter(m => {
        if (this.timeFilter === 'all') return true;
        const d = new Date(m.date);
        if (this.timeFilter === 'year') return d.getFullYear() === now.getFullYear();
        if (this.timeFilter === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        return true;
      });
    },
    filteredStats() {
      const matches = this.filteredMatches;
      let appearances = 0, goals = 0, assists = 0, wins = 0, draws = 0, losses = 0;
      let yellowCards = 0, redCards = 0, ownGoals = 0, ownerCount = 0, assistantCount = 0;
      for (const m of matches) {
        appearances++;
        const inA = m.teamA?.players?.includes(this.playerId);
        const aWin = m.teamA.score > m.teamB.score;
        const bWin = m.teamB.score > m.teamA.score;
        const draw = m.teamA.score === m.teamB.score;
        if (inA) {
          if (aWin) wins++; else if (draw) draws++; else losses++;
        } else {
          if (bWin) wins++; else if (draw) draws++; else losses++;
        }
        for (const e of (m.events || [])) {
          if (e.playerId !== this.playerId) continue;
          if (e.type === 'goal') goals++;
          if (e.type === 'assist') assists++;
          if (e.type === 'yellow') yellowCards++;
          if (e.type === 'red') redCards++;
          if (e.type === 'own_goal') ownGoals++;
        }
      }
      const ownerFiltered = this.filteredOwnerMatches;
      const assistantFiltered = this.filteredAssistantMatches;
      ownerCount = ownerFiltered.length;
      assistantCount = assistantFiltered.length;
      return { appearances, goals, assists, wins, draws, losses, yellowCards, redCards, ownGoals, ownerCount, assistantCount };
    },
    filteredOwnerMatches() {
      return this.filterByTime(this.ownerMatches);
    },
    filteredAssistantMatches() {
      return this.filterByTime(this.assistantMatches);
    },
    filteredRatingHistory() {
      const matchIds = new Set(this.filteredMatches.map(m => m._id));
      return this.ratingHistory.filter(r => matchIds.has(r.matchId));
    },
  },
  methods: {
    filterByTime(list) {
      if (!list.length) return [];
      const now = new Date();
      return list.filter(m => {
        if (this.timeFilter === 'all') return true;
        const d = new Date(m.date);
        if (this.timeFilter === 'year') return d.getFullYear() === now.getFullYear();
        if (this.timeFilter === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        return true;
      });
    },
    displayRating(rawScore) {
      if (rawScore == null || isNaN(rawScore)) return 5;
      const score = parseFloat(rawScore);
      
      return score < 6 ? 6 : score;
    },
    getMatchRating(m) {
      const ratings = this.player?.ratings;
      if (!ratings) return null;
      const peer = (ratings.peerRatings || []).find(r => r.matchId === m._id);
      const admin = (ratings.adminRatings || []).find(r => r.matchId === m._id);
      const all = [];
      if (peer) all.push(peer.score);
      if (admin) all.push(admin.score);
      if (all.length === 0) return null;
      return all.reduce((s, r) => s + r, 0) / all.length;
    },
    showAllMatchRawRatings() {
      this.allMatchRawRatingsData = this.filteredMatches.map(m => ({
        matchTitle: m.title,
        rawScore: this.getMatchRating(m),
        displayScore: this.displayRating(this.getMatchRating(m)),
        goals: (m.events || []).filter(e => e.type === 'goal' && e.playerId === this.playerId).length,
      })).filter(m => m.rawScore !== null);
      this.showAllMatchRawRatingsModal = true;
    },
    showMatchRawRatingFn(m) {
      const raw = this.getMatchRating(m);
      this.matchRawRatingData = { matchTitle: m.title, rawScore: raw };
      this.showMatchRawRating = true;
    },
    showRawRatingModal() {
      this.rawRatingData = this.player._liveRating;
      this.showRawRating = true;
    },
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        // 检查管理员身份
        const { result: loginRes } = await wx.cloud.callFunction({ name: 'login' });
        this.isAdmin = loginRes.isAdmin || false;
        this.isSuperAdmin = loginRes.isSuperAdmin || false;

        const { data } = await db.collection('players').doc(this.playerId).get();
        this.player = data;

        const { data: allMatches } = await db.collection('matches')
          .where({ 'registrations.playerId': this.playerId })
          .orderBy('date', 'desc')
          .get();

        // 同时查询所有已结束的比赛（用于评分计算，确保包含被直接分队的比赛）
        const { data: allCompletedMatches } = await db.collection('matches')
          .where({ status: 'completed' })
          .limit(100)
          .get();

        const registered = [];
        const confirmed = [];
        for (const m of allMatches) {
          const reg = m.registrations.find(r => r.playerId === this.playerId);
          if (!reg) continue;
          const enriched = { ...m, _regStatus: reg.status };
          if (reg.status === 'WL' || reg.status === 'pending_screenshot') {
            registered.push(enriched);
          } else if (reg.status === 'confirmed') {
            const inA = m.teamA?.players?.includes(this.playerId);
            const inB = m.teamB?.players?.includes(this.playerId);
            if (inA) enriched._teamColor = m.teamA?.color || '';
            if (inB) enriched._teamColor = m.teamB?.color || '';
            confirmed.push(enriched);
          }
        }
        this.registeredMatches = registered;
        this.confirmedMatches = confirmed;

        const completed = allMatches.filter(m => m.status === 'completed');
        this.matches = completed;

        // 实时计算综合评分（与云函数一致）
        const FRONT_POSITIONS = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'];
        const BACK_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM'];
        const validMatchIds = new Set(completed.map(m => m._id));

        let winPoints = 0, teamMatches = 0, yellowCount = 0, redCount = 0;
        let goals = 0, assists = 0;
        for (const m of completed) {
          const inA = m.teamA?.players?.includes(this.playerId);
          const inB = m.teamB?.players?.includes(this.playerId);
          if (!inA && !inB) continue;
          teamMatches++;
          const aScore = m.teamA?.score || 0, bScore = m.teamB?.score || 0;
          if (inA) {
            if (aScore > bScore) winPoints += 3;
            else if (aScore === bScore) winPoints += 1;
          } else {
            if (bScore > aScore) winPoints += 3;
            else if (bScore === aScore) winPoints += 1;
          }
          for (const e of (m.events || [])) {
            if (e.playerId === this.playerId) {
              if (e.type === 'goal') goals++;
              if (e.type === 'assist') assists++;
              if (e.type === 'yellow') yellowCount++;
              if (e.type === 'red') redCount++;
            }
          }
        }

        const isFront = data.positions?.some(pos => FRONT_POSITIONS.includes(pos));
        const isBack = data.positions?.some(pos => BACK_POSITIONS.includes(pos));

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

        // 互评和管理员评分（只统计已结束比赛）
        const ratings = data.ratings || {};
        const peerRatings = (ratings.peerRatings || []).filter(r => validMatchIds.has(r.matchId));
        const adminRatings = (ratings.adminRatings || []).filter(r => validMatchIds.has(r.matchId));
        const initialRating = (typeof ratings.initialRating === 'number') ? ratings.initialRating : 5;

        const peerAvg = peerRatings.length > 0
          ? peerRatings.reduce((s, r) => s + r.score, 0) / peerRatings.length
          : initialRating;
        const adminAvg = adminRatings.length > 0
          ? adminRatings.reduce((s, r) => s + r.score, 0) / adminRatings.length
          : initialRating;

        // 综合评分 = 互评50% + 管理员30% + 表现20%
        let compositeRating = peerAvg * 0.5 + adminAvg * 0.3 + performanceRating * 0.2;
        compositeRating = Math.min(10, Math.max(1, Math.round(compositeRating * 10) / 10));

        // 将实时计算的评分挂载到 player 对象上
        this.player = {
          ...data,
          _liveRating: {
            compositeRating,
            peerAvg,
            adminAvg,
            performanceRating
          }
        };

        // 获取场主和护法比赛
        const { result: roleRes } = await wx.cloud.callFunction({
          name: 'getPlayerMatches',
          data: { playerId: this.playerId }
        });
        this.ownerMatches = roleRes.ownerMatches || [];
        this.assistantMatches = roleRes.assistantMatches || [];

        // 评分历史（使用原始 ratings 数据）
        const allRatings = data.ratings || {};
        const allPeerRatings = allRatings.peerRatings || [];
        const allAdminRatings = allRatings.adminRatings || [];
        const allMatchIds = new Set([
          ...allPeerRatings.map(r => r.matchId),
          ...allAdminRatings.map(r => r.matchId)
        ]);
        const matchMap = {};
        for (const m of completed) matchMap[m._id] = m;

        this.ratingHistory = [...allMatchIds].map(mid => {
          const peer = allPeerRatings.find(r => r.matchId === mid);
          const admin = allAdminRatings.find(r => r.matchId === mid);
          const match = matchMap[mid];
          return {
            matchId: mid,
            matchTitle: match?.title || mid,
            peerScore: peer?.score || 0,
            adminScore: admin?.score || 0,
            performanceScore: 0,
          };
        }).sort((a, b) => {
          const ma = matchMap[a.matchId], mb = matchMap[b.matchId];
          if (!ma || !mb) return 0;
          return new Date(mb.date + 'T' + mb.time) - new Date(ma.date + 'T' + ma.time);
        });
      } catch (e) {
        console.error('加载失败', e);
      }
      wx.hideLoading();
    },
    getPositions(p) {
      if (!p?.positions) return '';
      return p.positions.map(pos => POSITIONS.find(pt => pt.id === pos)?.name || pos).join(' · ');
    },
    getResult(m) {
      const inA = m.teamA?.players?.includes(this.playerId);
      const aWin = m.teamA.score > m.teamB.score;
      const bWin = m.teamB.score > m.teamA.score;
      const draw = m.teamA.score === m.teamB.score;
      if (inA) return aWin ? '胜' : draw ? '平' : '负';
      return bWin ? '胜' : draw ? '平' : '负';
    },
    getResultClass(m) {
      const r = this.getResult(m);
      return r === '胜' ? 'win' : r === '负' ? 'loss' : 'draw';
    },

    // ===== 管理员操作 =====
    editPlayerInfo() {
      uni.navigateTo({ url: `/pages/players/create?playerId=${this.playerId}` });
    },

    async editInitialRating() {
      const current = this.player.ratings?.initialRating || 5;
      uni.showModal({
        title: '修改初始评分',
        content: `当前初始评分：${current}\n请输入新的初始评分（1-10）：`,
        editable: true,
        placeholderText: '1-10',
        success: async (res) => {
          if (res.confirm && res.content) {
            const newRating = parseInt(res.content.trim());
            if (isNaN(newRating) || newRating < 1 || newRating > 10) {
              uni.showToast({ title: '请输入1-10的整数', icon: 'none' });
              return;
            }
            wx.showLoading({ title: '保存中' });
            try {
              const db = wx.cloud.database();
              await db.collection('players').doc(this.playerId).update({
                data: {
                  'ratings.initialRating': newRating
                }
              });
              this.player.ratings = { ...this.player.ratings, initialRating: newRating };
              uni.showToast({ title: '已修改' });
            } catch (e) {
              uni.showToast({ title: '保存失败', icon: 'none' });
            }
            wx.hideLoading();
          }
        }
      });
    },

    async editAllowRating() {
      const current = this.player.allowRating !== false;
      uni.showActionSheet({
        itemList: ['✅ 允许队友评分', '🚫 不接受评分'],
        success: async (res) => {
          const newVal = res.tapIndex === 0;
          if (newVal === current) return;
          wx.showLoading({ title: '保存中' });
          try {
            const db = wx.cloud.database();
            await db.collection('players').doc(this.playerId).update({
              data: { allowRating: newVal }
            });
            this.player.allowRating = newVal;
            uni.showToast({ title: '已修改' });
          } catch (e) {
            uni.showToast({ title: '保存失败', icon: 'none' });
          }
          wx.hideLoading();
        }
      });
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; padding-bottom: 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.profile { display: flex; align-items: center; }
.avatar-wrapper { width: 128rpx; height: 128rpx; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-right: 32rpx; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; }
.avatar-text { font-weight: 700; font-size: 56rpx; color: #166534; }
.profile-info { flex: 1; }
.name { font-size: 40rpx; font-weight: 700; color: #111827; }
.real-name { font-size: 28rpx; color: #6b7280; margin-top: 4rpx; }
.positions { font-size: 26rpx; color: #9ca3af; margin-top: 8rpx; }
.rating-card { background: #f0fdf4; border: 2rpx solid #bbf7d0; }
.rating-big { text-align: center; margin-bottom: 20rpx; }
.rating-number { font-size: 72rpx; font-weight: 800; color: #16a34a; }
.rating-label { font-size: 28rpx; color: #6b7280; }
.rating-track { width: 100%; height: 16rpx; background: #e5e7eb; border-radius: 8rpx; margin: 16rpx 0; overflow: hidden; }
.rating-fill { height: 100%; background: #22c55e; border-radius: 8rpx; }
.rating-breakdown { display: flex; flex-direction: column; gap: 12rpx; margin-top: 16rpx; }
.breakdown-item { display: flex; align-items: center; gap: 12rpx; font-size: 26rpx; color: #4b5563; }
.breakdown-dot { width: 12rpx; height: 12rpx; border-radius: 50%; flex-shrink: 0; }
.section-title { font-size: 30rpx; font-weight: 700; margin-bottom: 20rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.filter-tabs { display: flex; gap: 12rpx; }
.filter-tab { font-size: 24rpx; padding: 8rpx 16rpx; border-radius: 8rpx; background: #f3f4f6; color: #6b7280; }
.filter-tab.active { background: #16a34a; color: #fff; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24rpx; text-align: center; }
.stat-item { padding: 16rpx 0; }
.stat-num { font-size: 40rpx; font-weight: 700; color: #16a34a; }
.stat-label { font-size: 24rpx; color: #6b7280; margin-top: 8rpx; }
.rating-history { display: flex; flex-direction: column; gap: 8rpx; }
.history-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8rpx; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; font-size: 26rpx; }
.history-header { font-weight: 600; color: #6b7280; border-bottom: 2rpx solid #e5e7eb; }
.history-match { color: #374151; }
.history-score { text-align: center; color: #9ca3af; }
.history-score.highlight { color: #16a34a; font-weight: 600; }
.sub-title { font-size: 26rpx; font-weight: 600; color: #ca8a04; margin-top: 16rpx; margin-bottom: 12rpx; }
.history-item { padding: 16rpx 0; border-bottom: 2rpx solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
.history-title { font-size: 30rpx; font-weight: 600; }
.history-meta { font-size: 24rpx; color: #9ca3af; margin-top: 4rpx; }
.history-result { font-size: 30rpx; font-weight: 700; }
.history-result.win { color: #16a34a; }
.history-result.loss { color: #dc2626; }
.history-result.draw { color: #6b7280; }
.empty { font-size: 26rpx; color: #9ca3af; text-align: center; padding: 40rpx 0; }
.birth-date { font-size: 24rpx; color: #9ca3af; margin-top: 8rpx; }
.ktt-last4 { font-size: 24rpx; color: #6b7280; margin-top: 8rpx; background: #eff6ff; padding: 4rpx 12rpx; border-radius: 8rpx; display: inline-block; }
.hwf-row { font-size: 24rpx; color: #9ca3af; margin-top: 8rpx; }
.no-rating-tag { font-size: 22rpx; color: #dc2626; background: #fef2f2; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 12rpx; font-weight: 500; }
.admin-action-row { display: flex; gap: 16rpx; }
.admin-action-btn { flex: 1; padding: 20rpx 0; text-align: center; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; background: #f0f9ff; color: #0369a1; }
.match-status-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.match-status-item:last-child { border-bottom: none; }
.match-info { flex: 1; min-width: 0; }
.status-tag { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 8rpx; font-weight: 600; flex-shrink: 0; margin-left: 16rpx; }
.status-tag.WL { background: #f3f4f6; color: #6b7280; }
.status-tag.pending_screenshot { background: #ffedd5; color: #9a3412; }
.status-tag.confirmed { background: #dcfce7; color: #166534; }
.team-color { font-size: 22rpx; color: #2563eb; margin-top: 4rpx; }

/* 参赛历史徽章 */
.history-badges { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; flex-wrap: wrap; }
.badge-rating { font-size: 22rpx; color: #f59e0b; font-weight: 700; background: #fef3c7; padding: 2rpx 10rpx; border-radius: 8rpx; }
.badge-rating.admin-clickable { cursor: pointer; border: 2rpx solid #f59e0b; }

/* 管理员查看原始评分按钮 */
.admin-raw-rating-btn { text-align: center; padding: 16rpx 0; margin-top: 16rpx; background: #f0f9ff; color: #0369a1; border-radius: 12rpx; font-size: 26rpx; font-weight: 600; }

/* 原始评分弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-popup { background: #fff; border-radius: 20rpx; width: 80%; max-height: 60vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 28rpx; border-bottom: 2rpx solid #f1f5f9; }
.modal-title { font-size: 32rpx; font-weight: 700; color: #1e293b; }
.modal-close { font-size: 36rpx; color: #94a3b8; padding: 8rpx; }
.modal-body { padding: 24rpx 28rpx; }
.raw-rating-row { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.raw-rating-row.total { border-bottom: none; font-weight: 700; }
.raw-label { font-size: 28rpx; color: #4b5563; }
.raw-value { font-size: 28rpx; color: #1e293b; font-weight: 700; }
</style>
