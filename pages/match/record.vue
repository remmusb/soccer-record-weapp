<template>
  <view class="container" v-if="match">
    <view class="card">
      <view class="match-title">{{match.title}}</view>
      <view class="match-meta">{{match.date}} {{match.time}} · 记录赛况</view>
    </view>

    <!-- 比分 -->
    <view class="card">
      <view class="section-title">📊 比分</view>
      <view class="score-row">
        <view class="score-team">
          <view class="score-label">{{teamAName}}</view>
          <view class="score-num">{{match.teamA.score}}</view>
          <view class="score-btn" @click="addScore('A')">+</view>
          <view class="score-btn" @click="minusScore('A')">-</view>
        </view>
        <view class="score-vs">VS</view>
        <view class="score-team">
          <view class="score-label">{{teamBName}}</view>
          <view class="score-num">{{match.teamB.score}}</view>
          <view class="score-btn" @click="addScore('B')">+</view>
          <view class="score-btn" @click="minusScore('B')">-</view>
        </view>
      </view>
    </view>

    <!-- A队赛况 -->
    <view class="card" v-if="teamAEvents.length > 0">
      <view class="section-title" style="color:#1e40af">🔵 {{teamAName}} 赛况</view>
      <view class="event-list">
        <view class="event-row" v-for="(e, i) in teamAEvents" :key="e.id">
          <text>{{eventIcon(e.type)}}</text>
          <text class="event-player">{{getPlayerName(e.playerId)}}</text>
          <text class="event-type-name">{{eventTypeName(e.type)}}</text>
          <text v-if="e.assistById" class="event-assist">(助攻: {{getPlayerName(e.assistById)}})</text>
          <text v-if="e.minute" class="event-min">{{e.minute}}'</text>
          <text class="delete-btn" @click="removeEvent(findEventIndex(e))">✕</text>
        </view>
      </view>
    </view>

    <!-- B队赛况 -->
    <view class="card" v-if="teamBEvents.length > 0">
      <view class="section-title" style="color:#991b1b">🔴 {{teamBName}} 赛况</view>
      <view class="event-list">
        <view class="event-row" v-for="(e, i) in teamBEvents" :key="e.id">
          <text>{{eventIcon(e.type)}}</text>
          <text class="event-player">{{getPlayerName(e.playerId)}}</text>
          <text class="event-type-name">{{eventTypeName(e.type)}}</text>
          <text v-if="e.assistById" class="event-assist">(助攻: {{getPlayerName(e.assistById)}})</text>
          <text v-if="e.minute" class="event-min">{{e.minute}}'</text>
          <text class="delete-btn" @click="removeEvent(findEventIndex(e))">✕</text>
        </view>
      </view>
    </view>

    <!-- 添加事件 -->
    <view class="card">
      <view class="section-title">➕ 添加事件</view>
      <view class="event-form">
        <view class="form-group">
          <text class="form-label">球员</text>
          <view class="picker" @click="openPlayerPicker">
            <text>{{selectedPlayer ? selectedPlayer.nickname : '选择球员'}}</text>
            <text>▼</text>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">事件类型</text>
          <view class="event-type-grid">
            <view class="event-type-item" v-for="t in EVENT_TYPES" :key="t.id" :class="{'selected': selectedType === t.id}" @click="selectedType = t.id">
              <text>{{t.icon}}</text>
              <text>{{t.name}}</text>
            </view>
          </view>
        </view>
        <view class="form-group" v-if="selectedType === 'goal'">
          <text class="form-label">助攻者（可选）</text>
          <view class="picker" @click="openAssistPicker">
            <text>{{selectedAssist ? selectedAssist.nickname : '无助攻'}}</text>
            <text>▼</text>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">时间（分钟）</text>
          <input class="form-input" v-model="eventMinute" type="number" placeholder="如 25" />
        </view>
        <view class="btn-primary" @click="addEvent">添加</view>
      </view>
    </view>

    <view class="submit-bar">
      <view class="btn-primary" @click="saveAll">💾 保存赛况</view>
    </view>

    <!-- 球员选择弹窗 -->
    <view class="picker-overlay" v-if="showPlayerPicker" @click="showPlayerPicker = false">
      <view class="picker-popup" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择球员</text>
          <text class="picker-close" @click="showPlayerPicker = false">✕</text>
        </view>
        <scroll-view scroll-y class="picker-body">
          <view class="picker-item" v-for="p in allPlayers" :key="p._id" @click="selectPlayer(p)">
            <view class="picker-dot" :style="{background: getTeamDotColor(p._id)}"></view>
            <text class="picker-name">{{p.nickname}}</text>
            <text v-if="isInTeamA(p._id)" class="picker-team-label">{{teamAName}}</text>
            <text v-else-if="isInTeamB(p._id)" class="picker-team-label">{{teamBName}}</text>
            <text v-else class="picker-team-label picker-team-none">未分队</text>
          </view>
        </scroll-view>
      </view>
    </view>
    <view class="picker-overlay" v-if="showPlayerPicker" @click="showPlayerPicker = false">
      <view class="picker-popup" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择球员</text>
          <text class="picker-close" @click="showPlayerPicker = false">✕</text>
        </view>
        <scroll-view scroll-y class="picker-body">
          <view class="picker-item" v-for="p in allPlayers" :key="p._id" @click="selectPlayer(p)">
            <text class="picker-name">{{p.nickname}}</text>
            <text v-if="isInTeamA(p._id)" class="picker-team-tag team-a-tag">{{teamAName || 'A队'}}</text>
            <text v-else-if="isInTeamB(p._id)" class="picker-team-tag team-b-tag">{{teamBName || 'B队'}}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 助攻选择弹窗 -->
    <view class="picker-overlay" v-if="showAssistPicker" @click="showAssistPicker = false">
      <view class="picker-popup" @click.stop>
        <view class="picker-header">
          <text class="picker-title">选择助攻者</text>
          <text class="picker-close" @click="showAssistPicker = false">✕</text>
        </view>
        <scroll-view scroll-y class="picker-body">
          <view class="picker-item" @click="selectAssist(null)">
            <text class="picker-name" style="color:#999">无助攻</text>
          </view>
          <view class="picker-item" v-for="p in assistPlayers" :key="p._id" @click="selectAssist(p)">
            <text class="picker-name">{{p.nickname}}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();

const EVENT_TYPES = [
  { id: 'goal', name: '进球', icon: '⚽' },
  { id: 'yellow', name: '黄牌', icon: '🟨' },
  { id: 'red', name: '红牌', icon: '🟥' },
  { id: 'own_goal', name: '乌龙', icon: '💥' },
  { id: 'penalty', name: '点球', icon: '⭕' },
  { id: 'sub_in', name: '替补上场', icon: '▶️' },
  { id: 'sub_out', name: '替补下场', icon: '⏹️' },
];

export default {
  data() {
    return {
      matchId: '',
      match: null,
      players: {},
      allPlayers: [],
      selectedPlayer: null,
      selectedType: 'goal',
      selectedAssist: null,
      eventMinute: '',
      EVENT_TYPES,
      showPlayerPicker: false,
      showAssistPicker: false,
    }
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadData();
  },
  computed: {
    teamAName() {
      return this.match?.teamA?.name || 'A队';
    },
    teamBName() {
      return this.match?.teamB?.name || 'B队';
    },
    teamAIds() {
      return new Set(this.match?.teamA?.players || []);
    },
    teamBIds() {
      return new Set(this.match?.teamB?.players || []);
    },
    events() {
      return this.match?.events || [];
    },
    teamAEvents() {
      return this.events
        .filter(e => this.teamAIds.has(e.playerId))
        .sort((a, b) => (a.minute || 0) - (b.minute || 0));
    },
    teamBEvents() {
      return this.events
        .filter(e => this.teamBIds.has(e.playerId))
        .sort((a, b) => (a.minute || 0) - (b.minute || 0));
    },
    assistPlayers() {
      // 助攻者不能是自己
      if (!this.selectedPlayer) return this.allPlayers;
      return this.allPlayers.filter(p => p._id !== this.selectedPlayer._id);
    }
  },
  methods: {
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        const { data } = await db.collection('matches').doc(this.matchId).get();
        this.match = data;
        
        const teamAIds = data.teamA?.players || [];
        const teamBIds = data.teamB?.players || [];
        // 包含所有已确认报名的球员（不只是分队中的），以及分队球员
        const confirmedIds = (data.registrations || [])
          .filter(r => r.status === 'confirmed' || r.status === 'screenshot_uploaded')
          .map(r => r.playerId);
        const allPlayerIds = [...new Set([...teamAIds, ...teamBIds, ...confirmedIds])].filter(id => id && !id.startsWith('temp_'));
        
        if (allPlayerIds.length > 0) {
          const { result } = await wx.cloud.callFunction({ 
            name: 'getPlayers',
            data: { playerIds: allPlayerIds }
          });
          const allDbPlayers = result.players || [];
          const matchedPlayers = allDbPlayers.filter(p => allPlayerIds.includes(p._id));
          
          this.allPlayers = matchedPlayers;
          this.allPlayers.forEach(p => {
            this.$set(this.players, p._id, p);
          });
          
          // 注入临时球员
          const regTemps = (data.registrations || []).filter(r => r.isTempPlayer || (r.playerId && r.playerId.startsWith('temp_')));
          regTemps.forEach(r => {
            this.$set(this.players, r.playerId, {
              _id: r.playerId,
              nickname: r.tempNickname || '临时球员',
              positions: r.tempPositions || [],
              stats: { rating: 5 }
            });
            if (!this.allPlayers.find(p => p._id === r.playerId)) {
              this.allPlayers.push(this.players[r.playerId]);
            }
          });
        }
      } catch (e) {
        console.error('加载失败', e);
      }
      wx.hideLoading();
    },
    openPlayerPicker() {
      this.showPlayerPicker = true;
    },
    selectPlayer(player) {
      this.selectedPlayer = player;
      this.showPlayerPicker = false;
      // 如果之前选的助攻者就是自己，清空
      if (this.selectedAssist && this.selectedAssist._id === player._id) {
        this.selectedAssist = null;
      }
    },
    openAssistPicker() {
      if (!this.selectedPlayer) {
        uni.showToast({ title: '请先选择球员', icon: 'none' });
        return;
      }
      this.showAssistPicker = true;
    },
    selectAssist(player) {
      this.selectedAssist = player;
      this.showAssistPicker = false;
    },
    getPlayerName(id) {
      return this.players[id]?.nickname || '未知';
    },
    eventIcon(type) {
      return EVENT_TYPES.find(t => t.id === type)?.icon || '';
    },
    eventTypeName(type) {
      return EVENT_TYPES.find(t => t.id === type)?.name || type;
    },
    isInTeamA(id) {
      return this.teamAIds.has(id);
    },
    isInTeamB(id) {
      return this.teamBIds.has(id);
    },
    getTeamDotColor(playerId) {
      // 根据球员所在队伍返回对应颜色
      const teamAName = String(this.match?.teamA?.name || '').trim().toLowerCase();
      const teamBName = String(this.match?.teamB?.name || '').trim().toLowerCase();
      const colorMap = {
        '白': '#e5e7eb', 'white': '#e5e7eb',
        '黑': '#1f2937', 'black': '#1f2937',
        '灰': '#6b7280', 'grey': '#6b7280', 'gray': '#6b7280',
        '红': '#dc2626', 'red': '#dc2626',
        '橙': '#f97316', 'orange': '#f97316',
        '黄': '#facc15', 'yellow': '#facc15',
        '绿': '#16a34a', 'green': '#16a34a',
        '青': '#06b6d4', 'cyan': '#06b6d4', 'teal': '#06b6d4',
        '蓝': '#3b82f6', 'blue': '#3b82f6',
        '紫': '#9333ea', 'purple': '#9333ea', 'violet': '#9333ea',
        '粉': '#ec4899', 'pink': '#ec4899',
      };
      if (this.isInTeamA(playerId)) {
        for (const [key, val] of Object.entries(colorMap)) {
          if (teamAName.includes(key)) return val;
        }
        return '#3b82f6';
      }
      if (this.isInTeamB(playerId)) {
        for (const [key, val] of Object.entries(colorMap)) {
          if (teamBName.includes(key)) return val;
        }
        return '#ef4444';
      }
      return '#9ca3af';
    },
    findEventIndex(event) {
      return this.events.findIndex(e => e.id === event.id);
    },
    addScore(team) {
      if (team === 'A') {
        this.match.teamA.score = (this.match.teamA.score || 0) + 1;
      } else {
        this.match.teamB.score = (this.match.teamB.score || 0) + 1;
      }
    },
    minusScore(team) {
      if (team === 'A') {
        this.match.teamA.score = Math.max(0, (this.match.teamA.score || 0) - 1);
      } else {
        this.match.teamB.score = Math.max(0, (this.match.teamB.score || 0) - 1);
      }
    },
    addEvent() {
      if (!this.selectedPlayer) {
        uni.showToast({ title: '请选择球员', icon: 'none' });
        return;
      }
      const player = this.selectedPlayer;
      const minute = this.eventMinute ? parseInt(this.eventMinute) : null;
      
      const events = [...(this.match.events || [])];
      const baseId = Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      
      // 添加主事件
      const event = {
        id: baseId,
        playerId: player._id,
        type: this.selectedType,
        minute,
      };
      
      // 如果是进球且选择了助攻者，将助攻者记录到进球事件的 assistById
      if (this.selectedType === 'goal' && this.selectedAssist) {
        event.assistById = this.selectedAssist._id;
      }
      
      events.push(event);
      
      this.match.events = events;
      this.selectedPlayer = null;
      this.selectedAssist = null;
      this.eventMinute = '';
      uni.showToast({ title: '已添加' });
    },
    removeEvent(idx) {
      if (idx < 0) return;
      const events = [...this.match.events];
      events.splice(idx, 1);
      this.match.events = events;
      uni.showToast({ title: '已删除' });
    },
    async saveAll() {
      wx.showLoading({ title: '保存中' });
      try {
        await db.collection('matches').doc(this.matchId).update({
          data: {
            'teamA.score': this.match.teamA.score,
            'teamB.score': this.match.teamB.score,
            events: this.match.events,
          }
        });
        uni.showToast({ title: '保存成功' });
        setTimeout(() => uni.navigateBack(), 800);
      } catch (e) {
        console.error('保存失败', e);
        uni.showToast({ title: '保存失败', icon: 'none' });
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
.score-row { display: flex; align-items: center; justify-content: center; gap: 40rpx; }
.score-team { text-align: center; }
.score-label { font-size: 26rpx; color: #6b7280; margin-bottom: 12rpx; }
.score-num { font-size: 72rpx; font-weight: 800; color: #16a34a; margin-bottom: 16rpx; }
.score-btn { display: inline-block; width: 64rpx; height: 64rpx; border-radius: 50%; background: #f3f4f6; font-size: 32rpx; font-weight: 700; color: #374151; line-height: 64rpx; text-align: center; margin: 0 8rpx; }
.score-vs { font-size: 32rpx; font-weight: 700; color: #9ca3af; }
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #6b7280; margin-bottom: 12rpx; display: block; }
.picker { width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; font-size: 30rpx; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; color: #374151; background: #fff; }
.event-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.event-type-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 20rpx; border-radius: 12rpx; background: #f3f4f6; font-size: 24rpx; }
.event-type-item.selected { background: #dcfce7; border: 2rpx solid #16a34a; color: #166534; }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; font-size: 30rpx; box-sizing: border-box; }
.btn-primary { background: #16a34a; color: #fff; border-radius: 16rpx; padding: 28rpx 0; text-align: center; font-weight: 600; font-size: 32rpx; }
.event-list { display: flex; flex-direction: column; gap: 12rpx; }
.event-row { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; font-size: 28rpx; }
.event-player { font-weight: 600; }
.event-type-name { color: #6b7280; }
.event-assist { color: #9ca3af; font-size: 24rpx; }
.event-min { color: #9ca3af; margin-left: auto; }
.delete-btn { color: #dc2626; padding: 8rpx; }
.submit-bar { padding: 20rpx 0; }

/* 自定义选择器 */
.picker-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.picker-popup { background: #fff; border-radius: 20rpx; width: 80%; max-height: 60vh; display: flex; flex-direction: column; }
.picker-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 28rpx; border-bottom: 2rpx solid #f1f5f9; }
.picker-title { font-size: 32rpx; font-weight: 700; color: #1e293b; }
.picker-close { font-size: 36rpx; color: #94a3b8; padding: 8rpx; }
.picker-body { max-height: 50vh; padding: 12rpx 0; }
.picker-item { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 28rpx; border-bottom: 2rpx solid #f8fafc; }
.picker-item:active { background: #f8fafc; }
.picker-name { font-size: 30rpx; color: #1e293b; font-weight: 600; }
.picker-dot { width: 20rpx; height: 20rpx; border-radius: 50%; flex-shrink: 0; border: 2rpx solid rgba(0,0,0,0.1); }
.picker-team-label { font-size: 22rpx; padding: 4rpx 10rpx; border-radius: 8rpx; font-weight: 600; background: #f3f4f6; color: #6b7280; }
.picker-team-none { background: #f3f4f6; color: #9ca3af; }
</style>
