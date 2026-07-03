<template>
  <view class="container">
    <view class="card">
      <view class="action-bar">
        <view class="btn-primary" @click="autoBalance">⚡ 自动均衡</view>
        <view class="btn-secondary" @click="clearTeams">🔄 清空</view>
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
            <view class="assign-btns">
              <text class="assign-a" @click="assign(p._id, 'A')">A</text>
              <text class="assign-b" @click="assign(p._id, 'B')">B</text>
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
export default {
  data() {
    return {
      matchId: '',
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [] },
      players: {},
      isAdmin: false,
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
      return (this.match.registrations || [])
        .filter(r => r.status === 'confirmed')
        .map(r => this.players[r.playerId])
        .filter(Boolean);
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
        const { result } = await wx.cloud.callFunction({ name: 'getAdmins' });
        const adminIds = result.admins || [];
        const { OPENID } = await wx.cloud.callFunction({ name: 'login' }).then(r => r.result);
        this.isAdmin = adminIds.includes(OPENID);
      } catch (e) {
        this.isAdmin = false;
      }
    },
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        const { data } = await db.collection('matches').doc(this.matchId).get();
        this.match = data;
        const playerIds = [...new Set(data.registrations.map(r => r.playerId))];
        if (playerIds.length > 0) {
          const { data: pList } = await db.collection('players').where({ _id: _.in(playerIds) }).get();
          pList.forEach(p => { this.players[p._id] = p; });
        }
      } catch (e) { console.error(e); }
      wx.hideLoading();
    },
    avgRating(team) {
      if (team.length === 0) return 0;
      return team.reduce((s, p) => s + (p.stats?.rating || 5), 0) / team.length;
    },
    avgAge(team) {
      if (team.length === 0) return 0;
      return team.reduce((s, p) => s + this.calcAge(p), 0) / team.length;
    },
    calcAge(player) {
      if (!player?.birthDate) return 30;
      const birth = new Date(player.birthDate + '-01');
      const now = new Date();
      return now.getFullYear() - birth.getFullYear();
    },
    avgHeight(team) {
      if (team.length === 0) return 0;
      const heights = team.filter(p => p.height).map(p => parseFloat(p.height));
      if (heights.length === 0) return 0;
      return heights.reduce((s, h) => s + h, 0) / heights.length;
    },
    avgWeight(team) {
      if (team.length === 0) return 0;
      const weights = team.filter(p => p.weight).map(p => parseFloat(p.weight));
      if (weights.length === 0) return 0;
      return weights.reduce((s, w) => s + w, 0) / weights.length;
    },
    heightDiff(teamA, teamB) {
      return Math.abs(this.avgHeight(teamA) - this.avgHeight(teamB));
    },
    weightDiff(teamA, teamB) {
      return Math.abs(this.avgWeight(teamA) - this.avgWeight(teamB));
    },
    getPositionCategory(player) {
      const positions = player?.positions || [];
      if (positions.includes('GK')) return 'GK';
      const backPositions = ['CB', 'LB', 'RB', 'CDM'];
      if (positions.some(p => backPositions.includes(p))) return 'BACK';
      const midPositions = ['CM', 'CAM'];
      if (positions.some(p => midPositions.includes(p))) return 'MID';
      const frontPositions = ['LW', 'RW', 'ST', 'CF'];
      if (positions.some(p => frontPositions.includes(p))) return 'FRONT';
      return 'BACK';
    },
    countByPosition(team) {
      return {
        GK: team.filter(p => this.getPositionCategory(p) === 'GK').length,
        BACK: team.filter(p => this.getPositionCategory(p) === 'BACK').length,
        MID: team.filter(p => this.getPositionCategory(p) === 'MID').length,
        FRONT: team.filter(p => this.getPositionCategory(p) === 'FRONT').length,
      };
    },
    positionScoreDiff(teamA, teamB) {
      const a = this.countByPosition(teamA);
      const b = this.countByPosition(teamB);
      // 理想比例 BACK:MID:FRONT = 2:2:1, GK 各1
      // 计算两队位置偏差惩罚值
      let penalty = 0;
      // GK 偏差：各队1个最好
      penalty += Math.abs(a.GK - b.GK) * 3;
      // BACK 偏差：尽量均衡
      penalty += Math.abs(a.BACK - b.BACK) * 1;
      // MID 偏差
      penalty += Math.abs(a.MID - b.MID) * 1;
      // FRONT 偏差
      penalty += Math.abs(a.FRONT - b.FRONT) * 1;
      return penalty;
    },
    async autoBalance() {
      const players = this.allRegistered;
      if (players.length < 2) {
        uni.showToast({ title: '人数不足', icon: 'none' });
        return;
      }
      
      // 按评分从高到低排序
      const sorted = [...players].sort((a, b) => (b.stats?.rating || 5) - (a.stats?.rating || 5));
      
      let teamA = [];
      let teamB = [];
      
      // 1. 先分配门将（GK 各队尽量一个）
      const gks = sorted.filter(p => this.getPositionCategory(p) === 'GK');
      const others = sorted.filter(p => this.getPositionCategory(p) !== 'GK');
      
      // 有2个门将 → 每队1个
      if (gks.length >= 2) {
        teamA.push(gks[0]);
        teamB.push(gks[1]);
      } else if (gks.length === 1) {
        teamA.push(gks[0]);
      }
      
      // 2. 分配剩余球员
      const remaining = others.concat(gks.length > 2 ? gks.slice(2) : []);
      
      for (const p of remaining) {
        const aRating = this.avgRating(teamA);
        const bRating = this.avgRating(teamB);
        const aCount = teamA.length;
        const bCount = teamB.length;
        const aHeight = this.avgHeight(teamA);
        const bHeight = this.avgHeight(teamB);
        const aWeight = this.avgWeight(teamA);
        const bWeight = this.avgWeight(teamB);
        
        // 人数差 >= 2 时，优先给人数少的队
        if (aCount - bCount >= 2) {
          teamB.push(p);
          continue;
        }
        if (bCount - aCount >= 2) {
          teamA.push(p);
          continue;
        }
        
        // 计算加入A队或B队后的评分差和位置差
        const aScore = aRating * aCount + (p.stats?.rating || 5);
        const bScore = bRating * bCount + (p.stats?.rating || 5);
        const newARating = aCount === 0 ? (p.stats?.rating || 5) : aScore / (aCount + 1);
        const newBRating = bCount === 0 ? (p.stats?.rating || 5) : bScore / (bCount + 1);
        
        // 位置均衡考虑
        const posA = this.positionScoreDiff([...teamA, p], teamB);
        const posB = this.positionScoreDiff(teamA, [...teamB, p]);
        
        // 身高体重均衡考虑
        const heightA = this.heightDiff([...teamA, p], teamB);
        const heightB = this.heightDiff(teamA, [...teamB, p]);
        const weightA = this.weightDiff([...teamA, p], teamB);
        const weightB = this.weightDiff(teamA, [...teamB, p]);
        
        // 综合得分：平均分低的队优先，但位置差、身高差、体重差不能太大
        const ratingDiffA = Math.abs(newARating - bRating);
        const ratingDiffB = Math.abs(aRating - newBRating);
        
        let preferA = false;
        
        // 优先给平均分低的队
        if (aRating <= bRating) {
          preferA = true;
        } else {
          preferA = false;
        }
        
        // 但如果加入后会导致位置严重失衡，调整
        if (posA > posB + 2) {
          preferA = false;
        } else if (posB > posA + 2) {
          preferA = true;
        }
        
        // 如果身高差过大，调整
        if (heightA > heightB + 2) {
          preferA = false;
        } else if (heightB > heightA + 2) {
          preferA = true;
        }
        
        // 如果体重差过大，调整
        if (weightA > weightB + 3) {
          preferA = false;
        } else if (weightB > weightA + 3) {
          preferA = true;
        }
        
        // 如果人数为奇数，尽量让平均分低的队多一人
        const totalCount = teamA.length + teamB.length + 1;
        if (totalCount % 2 === 1) {
          if (aRating <= bRating && aCount <= bCount) {
            preferA = true;
          } else if (bRating < aRating && bCount <= aCount) {
            preferA = false;
          }
        }
        
        if (preferA) {
          teamA.push(p);
        } else {
          teamB.push(p);
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
      await this.saveTeams();
      uni.showToast({ title: '已自动均衡' });
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
    async clearTeams() {
      this.match.teamA = { ...this.match.teamA, players: [], captainId: '', captainIdx: -1 };
      this.match.teamB = { ...this.match.teamB, players: [], captainId: '', captainIdx: -1 };
      await this.saveTeams();
    },
    async moveToB(id) {
      this.match.teamA.players = this.match.teamA.players.filter(pid => pid !== id);
      this.match.teamB.players.push(id);
      await this.saveTeams();
    },
    async moveToA(id) {
      this.match.teamB.players = this.match.teamB.players.filter(pid => pid !== id);
      this.match.teamA.players.push(id);
      await this.saveTeams();
    },
    async assign(id, team) {
      this.match.teamA.players = this.match.teamA.players.filter(pid => pid !== id);
      this.match.teamB.players = this.match.teamB.players.filter(pid => pid !== id);
      if (team === 'A') this.match.teamA.players.push(id);
      else this.match.teamB.players.push(id);
      await this.saveTeams();
    },
    async saveTeams() {
      await wx.cloud.callFunction({
        name: 'updateMatch',
        data: { matchId: this.matchId, updateData: {
          'teamA.players': this.match.teamA.players,
          'teamB.players': this.match.teamB.players,
        } }
      });
      this.loadData();
    },
    async save() {
      wx.showLoading({ title: '保存中' });
      try {
        await wx.cloud.callFunction({
          name: 'updateMatch',
          data: { matchId: this.matchId, updateData: {
            'teamA.color': this.match.teamA.color || '',
            'teamB.color': this.match.teamB.color || '',
            'teamA.captainId': this.match.teamA.captainId || '',
            'teamB.captainId': this.match.teamB.captainId || '',
            'teamA.players': this.match.teamA.players || [],
            'teamB.players': this.match.teamB.players || []
          } }
        });
        // 自动发送分队通知
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
</style>
