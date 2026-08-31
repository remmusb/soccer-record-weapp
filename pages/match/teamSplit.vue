<template>
  <view class="container">
    <view class="card">
      <view class="action-bar">
        <view class="btn-primary" @click="autoBalance">⚡ 自动分队</view>
        <view class="btn-primary" style="background: linear-gradient(135deg, #f59e0b, #d97706);" @click="startCaptainPick">🏆 队长选人</view>
        <view class="btn-secondary" @click="clearTeams">🔄 清空</view>
      </view>

      <!-- 队长选人模式提示 -->
      <view v-if="captainPickMode" class="captain-pick-status">
        <view v-if="!captainA || !captainB" class="captain-hint">
          <text class="hint-icon">👑</text>
          <text class="hint-text">请先设置两队队长（从未分配球员中选择）</text>
        </view>
        <view v-else class="captain-hint">
          <text class="hint-icon">🎯</text>
          <text class="hint-text">轮到 {{currentPicker === 'A' ? 'A队' : 'B队'}} 队长选人</text>
          <text style="font-size:22rpx;color:#92400e;margin-left:8rpx">({{pickOrder === 'alternate' ? 'ABAB轮流' : 'ABBA蛇形'}})</text>
        </view>
        <view class="captain-tags" v-if="captainA || captainB">
          <view class="captain-tag captain-a" v-if="captainA">
            <text>A队队长：{{players[captainA]?.nickname}}</text>
          </view>
          <view class="captain-tag captain-b" v-if="captainB">
            <text>B队队长：{{players[captainB]?.nickname}}</text>
          </view>
        </view>
      </view>

      <view class="teams">
        <view class="team team-a">
          <view class="team-header">
            <view class="team-title">{{match.teamA?.name || 'A队'}}</view>
            <view class="team-config">
              <input class="color-input" v-model="match.teamA.color" placeholder="队服颜色" />
              <picker class="captain-picker" :range="teamANames" :value="match.teamA.captainIdx || -1" @change="onCaptainAChange">
                <view class="picker-text">{{match.teamA.captainId ? teamA.find(p => p._id === match.teamA.captainId)?.nickname : '选队长'}}</view>
              </picker>
            </view>
          </view>
          <view class="team-stats" v-if="teamA.length > 0">
            评分 {{avgRating(teamA).toFixed(1)}} · 年龄 {{avgAge(teamA).toFixed(0)}} · 身高 {{avgHeight(teamA).toFixed(0)}} · 体重 {{avgWeight(teamA).toFixed(0)}} · {{teamA.length}} 人
          </view>
          <view class="team-list">
            <view class="team-player" v-for="p in teamA" :key="p._id">
              <text>{{p.nickname}}</text>
              <text class="move-btn" @click="moveToB(p._id)">➡️</text>
            </view>
          </view>
        </view>

        <view class="team team-b">
          <view class="team-header">
            <view class="team-title">{{match.teamB?.name || 'B队'}}</view>
            <view class="team-config">
              <input class="color-input" v-model="match.teamB.color" placeholder="队服颜色" />
              <picker class="captain-picker" :range="teamBNames" :value="match.teamB.captainIdx || -1" @change="onCaptainBChange">
                <view class="picker-text">{{match.teamB.captainId ? teamB.find(p => p._id === match.teamB.captainId)?.nickname : '选队长'}}</view>
              </picker>
            </view>
          </view>
          <view class="team-stats" v-if="teamB.length > 0">
            评分 {{avgRating(teamB).toFixed(1)}} · 年龄 {{avgAge(teamB).toFixed(0)}} · 身高 {{avgHeight(teamB).toFixed(0)}} · 体重 {{avgWeight(teamB).toFixed(0)}} · {{teamB.length}} 人
          </view>
          <view class="team-list">
            <view class="team-player" v-for="p in teamB" :key="p._id">
              <text class="move-btn" @click="moveToA(p._id)">⬅️</text>
              <text>{{p.nickname}}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="formation-section" v-if="teamA.length > 0 || teamB.length > 0">
        <view class="section-title">📋 阵型图</view>
        
        <!-- A队阵型 -->
        <view class="formation-card team-a-form" v-if="teamA.length > 0">
          <view class="formation-title">{{match.teamA?.name || 'A队'}} {{match.teamA.color || ''}}</view>
          <view class="formation-pitch">
            <view class="formation-row" v-for="(row, idx) in getFormation(teamA)" :key="idx">
              <view class="formation-pos-label">{{row.label}}</view>
              <view class="formation-players">
                <view class="formation-player" v-for="p in row.players" :key="p._id">
                  <image v-if="p.avatar" :src="p.avatar" mode="aspectFill" class="formation-avatar" />
                  <view v-else class="formation-avatar-placeholder">{{p.nickname[0]}}</view>
                  <text class="formation-name">{{p.nickname}}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- B队阵型 -->
        <view class="formation-card team-b-form" v-if="teamB.length > 0">
          <view class="formation-title">{{match.teamB?.name || 'B队'}} {{match.teamB.color || ''}}</view>
          <view class="formation-pitch">
            <view class="formation-row" v-for="(row, idx) in getFormation(teamB)" :key="idx">
              <view class="formation-pos-label">{{row.label}}</view>
              <view class="formation-players">
                <view class="formation-player" v-for="p in row.players" :key="p._id">
                  <image v-if="p.avatar" :src="p.avatar" mode="aspectFill" class="formation-avatar" />
                  <view v-else class="formation-avatar-placeholder">{{p.nickname[0]}}</view>
                  <text class="formation-name">{{p.nickname}}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="unassigned" v-if="unassigned.length > 0">
        <view class="section-title">未分配</view>
        <view class="unassigned-list">
          <view class="unassigned-item" v-for="p in unassigned" :key="p._id">
            <text>{{p.nickname}}</text>
            <view class="assign-btns" v-if="!captainPickMode">
              <text class="assign-a" @click="assign(p._id, 'A')">A</text>
              <text class="assign-b" @click="assign(p._id, 'B')">B</text>
            </view>
            <view class="captain-btns" v-else-if="(!captainA || !captainB) && p._id !== captainA && p._id !== captainB">
              <text v-if="!captainA" class="set-captain-a" @click="setCaptainA(p._id)">设为A队长</text>
              <text v-if="!captainB" class="set-captain-b" @click="setCaptainB(p._id)">设为B队长</text>
            </view>
            <view class="captain-btns" v-else-if="captainA && captainB && p._id !== captainA && p._id !== captainB">
              <text v-if="currentPicker === 'A'" class="pick-btn pick-a" @click="captainPickPlayer(p._id, 'A')">加入A队</text>
              <text v-else class="pick-btn pick-b" @click="captainPickPlayer(p._id, 'B')">加入B队</text>
            </view>
          </view>
        </view>
      </view>

      <view class="btn-primary" style="margin-top: 32rpx" @click="save">保存分队</view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();
const _ = db.command;

// 前场位置
const FRONT_POSITIONS = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'];
// 中场位置
const MID_POSITIONS = ['CM', 'CAM', 'CDM'];
// 后场位置
const BACK_POSITIONS = ['GK', 'CB', 'LB', 'RB'];

export default {
  data() {
    return {
      matchId: '',
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [] },
      players: {},
      isAdmin: false,
      captainPickMode: false,
      captainA: '',
      captainB: '',
      currentPicker: 'A',
      pickOrder: 'alternate', // 'alternate' = ABAB, 'snake' = ABBA
      pickRound: 0,
      pickCount: 0,
    }
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadData();
    this.checkAdmin();
  },
  computed: {
    allRegistered() {
      if (!this.match) return [];
      // 分队取所有已确认的球员（不受maxPlayers限制），包括临时球员
      const regs = (this.match.registrations || [])
        .filter(r => r.status !== 'cancelled')
        .map((r, idx) => ({ ...r, originalIndex: idx }));
      
      regs.sort((a, b) => {
        const aProtected = (a.playerId === this.match.ownerId || (this.match.assistantIds || []).includes(a.playerId)) ? 1 : 0;
        const bProtected = (b.playerId === this.match.ownerId || (this.match.assistantIds || []).includes(b.playerId)) ? 1 : 0;
        if (aProtected !== bProtected) return bProtected - aProtected;
        
        const priority = { confirmed: 3, screenshot_uploaded: 2, pending_screenshot: 1 };
        const aPri = priority[a.status] || 0;
        const bPri = priority[b.status] || 0;
        if (aPri !== bPri) return bPri - aPri;
        
        return a.originalIndex - b.originalIndex;
      });
      
      return regs.map(r => r.playerId).map(id => this.players[id]).filter(Boolean);
    },

    teamA() {
      if (!this.match) return [];
      return (this.match.teamA?.players || []).map(id => this.players[id]).filter(Boolean);
    },
    teamB() {
      if (!this.match) return [];
      return (this.match.teamB?.players || []).map(id => this.players[id]).filter(Boolean);
    },
    teamANames() {
      return this.teamA.map(p => p.nickname);
    },
    teamBNames() {
      return this.teamB.map(p => p.nickname);
    },
    unassigned() {
      const assigned = new Set([
        ...(this.match?.teamA?.players || []),
        ...(this.match?.teamB?.players || [])
      ]);
      return this.allRegistered.filter(p => !assigned.has(p._id));
    }
  },
  methods: {
    async checkAdmin() {
      try {
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        this.isAdmin = result.isAdmin || result.isSuperAdmin || false;
      } catch (e) {
        this.isAdmin = false;
      }
    },
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        const { data } = await db.collection('matches').doc(this.matchId).get();
        this.match = data;
        
        // 必须创建新对象来触发 Vue 2 响应式更新
        const playersMap = {};
        
        // 加载正式球员信息（通过云函数绕过权限限制）
        const playerIds = [...new Set((data.registrations || []).map(r => r.playerId).filter(id => !id.startsWith('temp_')))];
        if (playerIds.length > 0) {
          const { result } = await wx.cloud.callFunction({ name: 'getPlayers' });
          const allPlayers = result.players || [];
          allPlayers.forEach(p => {
            if (playerIds.includes(p._id)) {
              playersMap[p._id] = p;
            }
          });
        }
        
        // 注入临时球员信息
        (data.registrations || []).forEach(r => {
          if (r.isTempPlayer || (r.playerId && r.playerId.startsWith('temp_'))) {
            playersMap[r.playerId] = {
              _id: r.playerId,
              nickname: r.tempNickname || '临时球员',
              positions: r.tempPositions || [],
              height: '', weight: '', birthDate: '',
              stats: { rating: 5 }
            };
          }
        });
        
        // 整体替换触发响应式
        this.players = playersMap;
      } catch (e) { console.error(e); }
      wx.hideLoading();
    },
    getRating(p) { return p?.stats?.rating || 5; },
    getAge(p) {
      if (!p?.birthDate) return 30;
      try {
        const birth = new Date(p.birthDate + '-01');
        return new Date().getFullYear() - birth.getFullYear();
      } catch (e) { return 30; }
    },
    getHeight(p) { return p?.height ? parseFloat(p.height) : 0; },
    getWeight(p) { return p?.weight ? parseFloat(p.weight) : 0; },
    avgRating(team) {
      if (team.length === 0) return 0;
      return team.reduce((s, p) => s + this.getRating(p), 0) / team.length;
    },
    avgAge(team) {
      if (team.length === 0) return 0;
      return team.reduce((s, p) => s + this.getAge(p), 0) / team.length;
    },
    avgHeight(team) {
      const heights = team.map(p => this.getHeight(p)).filter(h => h > 0);
      if (heights.length === 0) return 0;
      return heights.reduce((s, h) => s + h, 0) / heights.length;
    },
    avgWeight(team) {
      const weights = team.map(p => this.getWeight(p)).filter(w => w > 0);
      if (weights.length === 0) return 0;
      return weights.reduce((s, w) => s + w, 0) / weights.length;
    },
    getPositionCategory(player) {
      // 优先使用首选位置
      const preferred = player?.preferredPosition;
      if (preferred) {
        if (preferred === 'GK') return 'GK';
        if (BACK_POSITIONS.includes(preferred)) return 'BACK';
        if (MID_POSITIONS.includes(preferred)) return 'MID';
        if (FRONT_POSITIONS.includes(preferred)) return 'FRONT';
      }
      const positions = player?.positions || [];
      if (positions.includes('GK')) return 'GK';
      if (positions.some(p => BACK_POSITIONS.includes(p))) return 'BACK';
      if (positions.some(p => MID_POSITIONS.includes(p))) return 'MID';
      if (positions.some(p => FRONT_POSITIONS.includes(p))) return 'FRONT';
      return 'BACK'; // 默认后场
    },
    
    
    async autoBalance() {
      this.captainPickMode = false;
      this.captainA = '';
      this.captainB = '';
      this.currentPicker = 'A';
      const players = this.allRegistered;
      if (players.length < 2) {
        uni.showToast({ title: '人数不足', icon: 'none' });
        return;
      }
      
      // 按评分从高到低排序（蛇形分配：强球员分散到两队）
      const sorted = [...players].sort((a, b) => this.getRating(b) - this.getRating(a));
      
      let teamA = [];
      let teamB = [];
      
      for (const player of sorted) {
        const aCount = teamA.length;
        const bCount = teamB.length;
        
        // 绝对优先：人数少的一队
        if (aCount < bCount) {
          teamA.push(player);
        } else if (bCount < aCount) {
          teamB.push(player);
        } else {
          // 人数相等时，比较综合因素
          const aTotalRating = teamA.reduce((s, p) => s + this.getRating(p), 0);
          const bTotalRating = teamB.reduce((s, p) => s + this.getRating(p), 0);
          
          // 考虑位置均衡
          const playerPos = this.getPositionCategory(player);
          const aHasPos = teamA.filter(p => this.getPositionCategory(p) === playerPos).length;
          const bHasPos = teamB.filter(p => this.getPositionCategory(p) === playerPos).length;
          
          let preferA = aTotalRating <= bTotalRating;
          
          // 如果某队严重缺少该位置，优先给那队
          if (aHasPos < bHasPos - 1) preferA = true;
          else if (bHasPos < aHasPos - 1) preferA = false;
          
          if (preferA) teamA.push(player);
          else teamB.push(player);
        }
      }
      
      this.match.teamA = { 
        ...this.match.teamA, 
        players: teamA.map(p => p._id),
        captainId: '' 
      };
      this.match.teamB = { 
        ...this.match.teamB, 
        players: teamB.map(p => p._id),
        captainId: '' 
      };
      uni.showToast({ title: '已自动均衡，请保存', icon: 'none' });
    },
    
    startCaptainPick() {
      this.clearTeams();
      this.captainPickMode = true;
      this.captainA = '';
      this.captainB = '';
      this.currentPicker = 'A';
      this.pickOrder = 'alternate';
      this.pickRound = 0;
      this.pickCount = 0;
      // 弹出模式选择
      uni.showActionSheet({
        title: '选择选人顺序',
        itemList: ['ABAB 轮流（A先）', 'ABBA 蛇形（A先）'],
        success: (res) => {
          this.pickOrder = res.tapIndex === 0 ? 'alternate' : 'snake';
          uni.showToast({ title: '请先设置两队队长', icon: 'none' });
        }
      });
    },
    setCaptainA(playerId) {
      this.captainA = playerId;
      this.match.teamA.players = [playerId];
      this.match.teamA.captainId = playerId;
      if (this.captainB) {
        this.currentPicker = 'A';
        uni.showToast({ title: 'A队队长先选', icon: 'none' });
      }
    },
    setCaptainB(playerId) {
      this.captainB = playerId;
      this.match.teamB.players = [playerId];
      this.match.teamB.captainId = playerId;
      if (this.captainA) {
        this.currentPicker = 'A';
        uni.showToast({ title: 'A队队长先选', icon: 'none' });
      }
    },
    captainPickPlayer(playerId, team) {
      if (team === 'A') {
        this.match.teamA.players.push(playerId);
      } else {
        this.match.teamB.players.push(playerId);
      }
      this.pickCount++;
      // 计算下一个选人者
      if (this.pickOrder === 'alternate') {
        // ABAB: A→B→A→B
        this.currentPicker = this.currentPicker === 'A' ? 'B' : 'A';
      } else {
        // ABBA 蛇形: A→B→B→A→A→B→B→A...
        const round = Math.floor(this.pickCount / 2);
        const posInRound = this.pickCount % 2;
        if (round % 2 === 0) {
          // 偶数轮: A先B后
          this.currentPicker = posInRound === 0 ? 'B' : 'A';
        } else {
          // 奇数轮: B先A后
          this.currentPicker = posInRound === 0 ? 'A' : 'B';
        }
      }
    },
    
    getFormation(team) {
      const rows = [];
      const gks = team.filter(p => this.getPositionCategory(p) === 'GK');
      const backs = team.filter(p => this.getPositionCategory(p) === 'BACK');
      const mids = team.filter(p => this.getPositionCategory(p) === 'MID');
      const fronts = team.filter(p => this.getPositionCategory(p) === 'FRONT');
      if (gks.length > 0) rows.push({ label: '门将', players: gks });
      if (backs.length > 0) rows.push({ label: '后场', players: backs });
      if (mids.length > 0) rows.push({ label: '中场', players: mids });
      if (fronts.length > 0) rows.push({ label: '前锋', players: fronts });
      return rows;
    },
    onCaptainAChange(e) {
      const idx = e.detail.value;
      this.match.teamA.captainId = this.teamA[idx]._id;
      this.match.teamA.captainIdx = idx;
    },
    onCaptainBChange(e) {
      const idx = e.detail.value;
      this.match.teamB.captainId = this.teamB[idx]._id;
      this.match.teamB.captainIdx = idx;
    },
    clearTeams() {
      this.match.teamA = { ...this.match.teamA, players: [], captainId: '', captainIdx: -1 };
      this.match.teamB = { ...this.match.teamB, players: [], captainId: '', captainIdx: -1 };
      this.captainPickMode = false;
      this.captainA = '';
      this.captainB = '';
      this.currentPicker = 'A';
      this.pickOrder = 'alternate';
      this.pickRound = 0;
      this.pickCount = 0;
    },
    moveToB(id) {
      this.match.teamA.players = this.match.teamA.players.filter(pid => pid !== id);
      this.match.teamB.players.push(id);
    },
    moveToA(id) {
      this.match.teamB.players = this.match.teamB.players.filter(pid => pid !== id);
      this.match.teamA.players.push(id);
    },
    assign(id, team) {
      this.match.teamA.players = this.match.teamA.players.filter(pid => pid !== id);
      this.match.teamB.players = this.match.teamB.players.filter(pid => pid !== id);
      if (team === 'A') this.match.teamA.players.push(id);
      else this.match.teamB.players.push(id);
    },
    async save() {
      wx.showLoading({ title: '保存中' });
      try {
        const updateData = {
          'teamA.color': this.match.teamA.color || '',
          'teamB.color': this.match.teamB.color || '',
          'teamA.captainId': this.match.teamA.captainId || '',
          'teamB.captainId': this.match.teamB.captainId || '',
          'teamA.players': this.match.teamA.players || [],
          'teamB.players': this.match.teamB.players || []
        };
        // 队长选人模式下保存 captainPick 状态
        if (this.captainPickMode && this.captainA && this.captainB) {
          updateData.captainPick = {
            captainA: this.captainA,
            captainB: this.captainB,
            pickOrder: this.pickOrder,
            currentPicker: this.currentPicker,
            pickCount: this.pickCount,
            status: 'picking'
          };
        }
        await wx.cloud.callFunction({
          name: 'updateMatch',
          data: { matchId: this.matchId, updateData }
        });
        if (this.isAdmin) {
          try {
            await wx.cloud.callFunction({
              name: 'sendNotification',
              data: { type: 'team_split', matchId: this.matchId }
            });
          } catch (e) { console.error('分队通知发送失败', e); }
        }
        uni.showToast({ title: '分队已保存' });
        setTimeout(() => uni.navigateBack(), 500);
      } catch (e) {
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
      wx.hideLoading();
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; padding-bottom: 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.action-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin-bottom: 24rpx; }
.teams { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.team { border-radius: 16rpx; padding: 20rpx; }
.team-a { background: #eff6ff; border: 2rpx solid #bfdbfe; }
.team-b { background: #fef2f2; border: 2rpx solid #fecaca; }
.team-title { text-align: center; font-weight: 700; font-size: 32rpx; }
.team-a .team-title { color: #1e40af; }
.team-b .team-title { color: #991b1b; }
.team-stats { text-align: center; font-size: 24rpx; color: #6b7280; margin: 8rpx 0 16rpx; }
.team-list { display: flex; flex-direction: column; gap: 12rpx; }
.team-player { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 12rpx 16rpx; border-radius: 12rpx; font-size: 28rpx; }
.move-btn { font-size: 24rpx; color: #9ca3af; padding: 8rpx; }
.unassigned { margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #f3f4f6; }
.section-title { font-size: 30rpx; font-weight: 700; margin-bottom: 16rpx; }
.unassigned-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.unassigned-item { display: flex; align-items: center; gap: 12rpx; background: #f3f4f6; padding: 12rpx 20rpx; border-radius: 12rpx; font-size: 28rpx; }
.assign-btns { display: flex; gap: 8rpx; }
.assign-a { color: #2563eb; font-weight: 700; padding: 4rpx 12rpx; }
.assign-b { color: #dc2626; font-weight: 700; padding: 4rpx 12rpx; }

.team-header { display: flex; flex-direction: column; gap: 8rpx; margin-bottom: 8rpx; }
.team-config { display: flex; gap: 8rpx; }
.color-input { flex: 1; height: 56rpx; padding: 0 12rpx; border: 2rpx solid #e5e7eb; border-radius: 8rpx; font-size: 24rpx; }
.captain-picker { flex: 1; height: 56rpx; padding: 0 12rpx; border: 2rpx solid #e5e7eb; border-radius: 8rpx; font-size: 24rpx; display: flex; align-items: center; }
.picker-text { font-size: 24rpx; color: #374151; }

.formation-section { margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #f3f4f6; }
.formation-card { border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; }
.team-a-form { background: #eff6ff; border: 2rpx solid #bfdbfe; }
.team-b-form { background: #fef2f2; border: 2rpx solid #fecaca; }
.formation-title { text-align: center; font-weight: 700; font-size: 30rpx; margin-bottom: 16rpx; }
.team-a-form .formation-title { color: #1e40af; }
.team-b-form .formation-title { color: #991b1b; }
.formation-pitch {
  background: linear-gradient(180deg, #1a5c1a 0%, #2d7a2d 100%);
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  position: relative;
  border: 4rpx solid #fff;
  box-shadow: inset 0 0 0 2rpx rgba(255,255,255,0.3);
}

.formation-pitch::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 24rpx;
  right: 24rpx;
  height: 2rpx;
  background: rgba(255,255,255,0.4);
  transform: translateY(-50%);
}

.formation-pitch::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80rpx;
  height: 80rpx;
  border: 2rpx solid rgba(255,255,255,0.4);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.formation-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  position: relative;
  z-index: 1;
  padding: 12rpx 0;
}

.formation-pos-label {
  width: 80rpx;
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
  text-align: center;
  flex-shrink: 0;
  font-weight: 600;
}

.formation-players {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
}

.formation-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.formation-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.2);
}

.formation-avatar-placeholder {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #dcfce7;
  color: #166534;
  font-weight: 700;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #fff;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.2);
}

.formation-name {
  font-size: 22rpx;
  color: #fff;
  max-width: 100rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.3);
}

/* 队长选人模式 */
.captain-pick-status {
  background: linear-gradient(135deg, #fef3c7, #fef9c8);
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.captain-hint {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.hint-icon {
  font-size: 32rpx;
}
.hint-text {
  font-size: 28rpx;
  color: #92400e;
  font-weight: 700;
}
.captain-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.captain-tag {
  padding: 8rpx 16rpx;
  border-radius: 10rpx;
  font-size: 24rpx;
  font-weight: 700;
}
.captain-a {
  background: #dbeafe;
  color: #1e40af;
}
.captain-b {
  background: #fee2e2;
  color: #991b1b;
}
.captain-btns {
  display: flex;
  gap: 8rpx;
}
.set-captain-a {
  background: #dbeafe;
  color: #1e40af;
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
}
.set-captain-b {
  background: #fee2e2;
  color: #991b1b;
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
}
.pick-btn {
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
}
.pick-a {
  background: #dbeafe;
  color: #1e40af;
}
.pick-b {
  background: #fee2e2;
  color: #991b1b;
}
</style>
