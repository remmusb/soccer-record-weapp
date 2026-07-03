<template>
  <view class="container">
    <view class="card" v-if="isAdmin">
      <view class="section-title">🧪 调试工具</view>
      <view class="btn-secondary" @click="recalculate">📊 重新计算统计</view>
      <view class="debug-result" v-if="debugResult">
        <view class="debug-status" :class="debugResult.success ? 'success' : 'fail'">
          {{debugResult.success ? '计算成功' : '计算失败'}}
        </view>
        <view v-if="debugResult.success" class="debug-list">
          <view class="debug-row" v-for="r in debugResult.results" :key="r.playerId">
            <text>{{r.nickname}}: 初始{{r.initialRating}} → 综合{{r.compositeRating}} (队友{{r.peerAvg}} 系统{{r.adminAvg}} 表现{{r.performanceRating}})</text>
          </view>
        </view>
        <view v-else class="debug-error">{{debugResult.error}}</view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">👥 管理员列表</view>
      <view class="admin-list">
        <view class="admin-item" v-for="a in admins" :key="a._id">
          <view class="admin-info">
            <view class="avatar">{{a.nickname?.[0] || '?'}}</view>
            <view>
              <view class="admin-name">{{a.nickname}}</view>
              <view class="admin-meta">{{a.name}}</view>
            </view>
          </view>
          <view class="remove-btn" @click="removeAdmin(a._id)">移除</view>
        </view>
      </view>
      <view class="empty" v-if="admins.length === 0">暂无管理员，请添加</view>
    </view>

    <view class="card">
      <view class="section-title">➕ 添加管理员</view>
      <view class="form-group">
        <text class="form-label">选择球员</text>
        <picker :range="playerNames" :value="selectedIndex" @change="onPlayerChange">
          <view class="picker">
            <text :class="{'picker-placeholder': selectedIndex < 0}">{{selectedIndex >= 0 ? playerNames[selectedIndex] : '选择球员'}}</text>
            <text>▼</text>
          </view>
        </picker>
      </view>
      <view class="btn-primary" style="margin-top:16rpx" :class="{'disabled': adding || selectedIndex < 0}" @click="addAdmin">添加为管理员</view>
    </view>

    <view class="card">
      <view class="section-title">💾 数据管理</view>
      <view class="btn-secondary" @click="exportData">📤 导出数据</view>
      <view class="btn-secondary" style="margin-top:16rpx" @click="clearData">🗑️ 清空所有数据</view>
    </view>

    <view class="footer">野球记录小程序 v1.0</view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      players: [],
      admins: [],
      selectedIndex: -1,
      adding: false,
      isAdmin: false,
      debugResult: null,
    }
  },
  computed: {
    playerNames() {
      return this.players.map(p => p.nickname);
    }
  },
  onShow() {
    this.loadData();
  },
  methods: {
    async loadData() {
      wx.showLoading({ title: '加载中' });
      try {
        // 用云函数获取数据，绕过客户端权限限制
        const [pRes, aRes, loginRes] = await Promise.all([
          wx.cloud.callFunction({ name: 'getPlayers' }),
          wx.cloud.callFunction({ name: 'getAdmins' }),
          wx.cloud.callFunction({ name: 'login' })
        ]);
        this.players = pRes.result.players || [];
        this.isAdmin = loginRes.result.isAdmin || false;
        const adminsData = aRes.result.admins || [];
        
        // 加载管理员对应的球员信息
        this.admins = adminsData.map(a => {
          const player = this.players.find(p => p._id === a.playerId);
          return { ...a, nickname: player?.nickname || '未知', name: player?.name || '' };
        });
      } catch (e) { 
        console.error('加载失败', e);
        uni.showToast({ title: '加载失败: ' + (e.message || ''), icon: 'none' });
      }
      wx.hideLoading();
    },
    onPlayerChange(e) {
      this.selectedIndex = e.detail.value;
    },
    async addAdmin() {
      if (this.selectedIndex < 0) return;
      const player = this.players[this.selectedIndex];
      if (this.admins.some(a => a.playerId === player._id)) {
        uni.showToast({ title: '该球员已是管理员', icon: 'none' });
        return;
      }
      
      this.adding = true;
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'addAdmin',
          data: { playerId: player._id }
        });
        if (result.success) {
          uni.showToast({ title: '添加成功' });
          this.selectedIndex = -1;
          this.loadData();
        } else {
          uni.showToast({ title: result.error || '添加失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: '添加失败', icon: 'none' });
      }
      this.adding = false;
    },
    async removeAdmin(id) {
      uni.showModal({
        title: '确认移除',
        content: '移除该管理员？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const { result } = await wx.cloud.callFunction({
                name: 'removeAdmin',
                data: { adminId: id }
              });
              if (result.success) {
                uni.showToast({ title: '已移除' });
                this.loadData();
              } else {
                uni.showToast({ title: result.error || '移除失败', icon: 'none' });
              }
            } catch (e) {
              uni.showToast({ title: '移除失败', icon: 'none' });
            }
          }
        }
      });
    },
    async recalculate() {
      wx.showLoading({ title: '计算中' });
      try {
        const { result } = await wx.cloud.callFunction({ name: 'recalculateStats' });
        this.debugResult = result;
        if (result.success) {
          uni.showToast({ title: '已更新 ' + result.updated + ' 人' });
        } else {
          uni.showToast({ title: result.error || '计算失败', icon: 'none' });
        }
      } catch (e) {
        console.error(e);
        this.debugResult = { success: false, error: e.message || '调用失败' };
        uni.showToast({ title: '计算失败', icon: 'none' });
      }
      wx.hideLoading();
    },
    async exportData() {
      wx.showLoading({ title: '导出中' });
      try {
        const { result } = await wx.cloud.callFunction({ name: 'exportData' });
        console.log('players:', result.players);
        console.log('matches:', result.matches);
        uni.showToast({ title: '数据已输出到控制台' });
      } catch (e) {
        console.error(e);
        uni.showToast({ title: '导出失败', icon: 'none' });
      }
      wx.hideLoading();
    },
    clearData() {
      uni.showModal({
        title: '确认清空',
        content: '此操作不可恢复，确定清空所有数据？',
        success: (res) => {
          if (res.confirm) {
            uni.showToast({ title: '请在云控制台清空', icon: 'none' });
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; padding-bottom: 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.section-title { font-size: 30rpx; font-weight: 700; margin-bottom: 20rpx; }
.admin-list { display: flex; flex-direction: column; gap: 16rpx; }
.admin-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx; border-radius: 12rpx; background: #f9fafb; }
.admin-info { display: flex; align-items: center; gap: 16rpx; }
.avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: #dcfce7; color: #166534; font-weight: 700; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }
.admin-name { font-size: 30rpx; font-weight: 600; }
.admin-meta { font-size: 24rpx; color: #9ca3af; margin-top: 4rpx; }
.remove-btn { font-size: 26rpx; color: #dc2626; padding: 8rpx 16rpx; }
.empty { font-size: 26rpx; color: #9ca3af; text-align: center; padding: 40rpx 0; }
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #6b7280; margin-bottom: 12rpx; display: block; }
.picker { width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; font-size: 30rpx; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; color: #374151; }
.picker-placeholder { color: #9ca3af; }
.btn-primary { background: #16a34a; color: #fff; border-radius: 16rpx; padding: 28rpx 0; text-align: center; font-weight: 600; font-size: 32rpx; }
.btn-primary.disabled { opacity: 0.5; }
.btn-secondary { background: #f3f4f6; color: #374151; border-radius: 16rpx; padding: 28rpx 0; text-align: center; font-weight: 600; font-size: 32rpx; }
.debug-result { margin-top: 20rpx; padding: 16rpx; background: #f9fafb; border-radius: 12rpx; font-size: 24rpx; }
.debug-status { font-weight: 700; margin-bottom: 12rpx; }
.debug-status.success { color: #16a34a; }
.debug-status.fail { color: #dc2626; }
.debug-list { display: flex; flex-direction: column; gap: 8rpx; }
.debug-row { color: #374151; word-break: break-all; }
.debug-error { color: #dc2626; }
.footer { text-align: center; font-size: 24rpx; color: #9ca3af; margin-top: 40rpx; }
</style>
