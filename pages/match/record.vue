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

    <!-- 添加事件 -->
    <view class="card">
      <view class="section-title">➕ 添加事件</view>
      <view class="event-form">
        <view class="form-group">
          <text class="form-label">球员</text>
          <picker :range="allPlayerNames" :value="selectedPlayerIdx" @change="onPlayerChange">
            <view class="picker">
              <text>{{selectedPlayerIdx >= 0 ? allPlayerNames[selectedPlayerIdx] : '选择球员'}}</text>
              <text>▼</text>
            </view>
          </picker>
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
          <picker :range="assistPlayerNames" :value="selectedAssistIdx" @change="onAssistChange">
            <view class="picker">
              <text>{{selectedAssistIdx >= 0 ? assistPlayerNames[selectedAssistIdx] : '无助攻'}}</text>
              <text>▼</text>
            </view>
          </picker>
        </view>
        <view class="form-group">
          <text class="form-label">时间（分钟）</text>
          <input class="form-input" v-model="eventMinute" type="number" placeholder="如 25" />
        </view>
        <view class="btn-primary" @click="addEvent">添加</view>
      </view>
    </view>

    <!-- 事件列表 -->
    <view class="card" v-if="events.length > 0">
      <view class="section-title">📋 已记录事件</view>
      <view class="event-list">
        <view class="event-row" v-for="(e, i) in sortedEvents" :key="i">
          <text>{{eventIcon(e.type)}}</text>
          <text class="event-player">{{getPlayerName(e.playerId)}}</text>
          <text class="event-type-name">{{eventTypeName(e.type)}}</text>
          <text v-if="e.assistById" class="event-assist">(助攻: {{getPlayerName(e.assistById)}})</text>
          <text v-if="e.minute" class="event-min">{{e.minute}}'</text>
          <text class="delete-btn" @click="removeEvent(i)">✕</text>
        </view>
      </view>
    </view>

    <view class="submit-bar">
      <view class="btn-primary" @click="saveAll">💾 保存赛况</view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();
const _ = db.command;

const EVENT_TYPES = [
  { id: 'goal', name: '进球', icon: '⚽' },
  { id: 'assist', name: '助攻', icon: '🤝' },
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
      selectedPlayerIdx: -1,
      selectedType: 'goal',
      selectedAssistIdx: -1,
      eventMinute: '',
      EVENT_TYPES,
    }
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadData();
  },
  computed: {
    teamAName() {
      return this.match?.teamA?.color || '';
    },
    teamBName() {
      return this.match?.teamB?.color || '';
    },
    allPlayerNames() {
      return this.allPlayers.map(p => p.nickname);
    },
    assistPlayerNames() {
      // 助攻者列表：所有球员 + "无助攻"选项
      const names = this.allPlayers.map(p => p.nickname);
      return ['无助攻', ...names];
    },
    events() {
      return this.match?.events || [];
    },
    sortedEvents() {
      return [...this.events].sort((a, b) => (a.minute || 0) - (b.minute || 0));
    }
  },
  methods: {
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        const { data } = await db.collection('matches').doc(this.matchId).get();
        this.match = data;
        
        const playerIds = [
          ...new Set([
            ...(data.teamA?.players || []),
            ...(data.teamB?.players || []),
          ])
        ];
        
        if (playerIds.length > 0) {
          const { data: pList } = await db.collection('players').where({ _id: _.in(playerIds) }).get();
          this.allPlayers = pList;
          pList.forEach(p => {
            this.players[p._id] = p;
          });
        }
      } catch (e) {
        console.error('加载失败', e);
      }
      wx.hideLoading();
    },
    onPlayerChange(e) {
      this.selectedPlayerIdx = e.detail.value;
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
    onAssistChange(e) {
      this.selectedAssistIdx = e.detail.value - 1; // 减去"无助攻"选项
    },
    addEvent() {
      if (this.selectedPlayerIdx < 0) {
        uni.showToast({ title: '请选择球员', icon: 'none' });
        return;
      }
      const player = this.allPlayers[this.selectedPlayerIdx];
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
      events.push(event);
      
      // 如果是进球且选择了助攻者，同时添加助攻事件
      if (this.selectedType === 'goal' && this.selectedAssistIdx >= 0) {
        const assistPlayer = this.allPlayers[this.selectedAssistIdx];
        const assistEvent = {
          id: baseId + '_assist',
          playerId: assistPlayer._id,
          type: 'assist',
          minute,
          assistById: player._id, // 关联进球事件
        };
        events.push(assistEvent);
      }
      
      this.match.events = events;
      this.selectedPlayerIdx = -1;
      this.selectedAssistIdx = -1;
      this.eventMinute = '';
      uni.showToast({ title: '已添加' });
    },
    removeEvent(idx) {
      const events = [...this.match.events];
      const removedEvent = events[idx];
      
      // 如果删除的是进球事件，同时删除关联的助攻事件
      if (removedEvent.type === 'goal') {
        const assistIdx = events.findIndex(e => e.id === removedEvent.id + '_assist');
        if (assistIdx >= 0) {
          events.splice(assistIdx, 1);
          // 如果助攻事件在进球事件之前，需要调整索引
          if (assistIdx < idx) {
            idx--;
          }
        }
      }
      
      // 如果删除的是助攻事件，同时删除关联的进球事件
      if (removedEvent.type === 'assist' && removedEvent.id.endsWith('_assist')) {
        const goalId = removedEvent.id.replace('_assist', '');
        const goalIdx = events.findIndex(e => e.id === goalId);
        if (goalIdx >= 0) {
          events.splice(goalIdx, 1);
          if (goalIdx < idx) {
            idx--;
          }
        }
      }
      
      events.splice(idx, 1);
      this.match.events = events;
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
.picker { width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; font-size: 30rpx; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; color: #374151; }
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
</style>
