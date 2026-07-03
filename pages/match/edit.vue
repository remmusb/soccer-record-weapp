<template>
  <view class="container">
    <view class="card">
      <view class="form-group">
        <text class="form-label">场次名称</text>
        <input class="form-input" v-model="form.title" placeholder="如 周中野球局" />
      </view>

      <view class="form-row">
        <view class="form-group" style="flex:1">
          <text class="form-label">日期</text>
          <picker mode="date" :value="form.date" @change="onDateChange">
            <view class="picker">
              <text :class="{'picker-placeholder': !form.date}">{{form.date || '选择日期'}}</text>
              <text>▼</text>
            </view>
          </picker>
        </view>
        <view class="form-group" style="flex:1;margin-left:20rpx">
          <text class="form-label">开始时间</text>
          <picker mode="time" :value="form.time" @change="onTimeChange">
            <view class="picker">
              <text :class="{'picker-placeholder': !form.time}">{{form.time || '选择时间'}}</text>
              <text>▼</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="form-group">
        <text class="form-label">地点</text>
        <view class="location-row">
          <input class="form-input location-input" v-model="form.location" placeholder="如 XX足球场" />
          <view class="btn-map" @click="chooseLocation">📍 地图选点</view>
        </view>
      </view>

      <view class="form-row">
        <view class="form-group" style="flex:1">
          <text class="form-label">人数上限</text>
          <input class="form-input" v-model="form.maxPlayers" type="number" placeholder="14" />
        </view>
        <view class="form-group" style="flex:1;margin-left:20rpx">
          <text class="form-label">是否需要抽场</text>
          <view class="switch-row">
            <text>{{form.needScreenshot ? '需要抽场' : '不需要抽场'}}</text>
            <switch :checked="form.needScreenshot" @change="handleSwitchChange" />
          </view>
        </view>
      </view>

      <view class="form-group" v-if="form.needScreenshot">
        <text class="form-label">截图截止</text>
        <view class="deadline-row">
          <view class="deadline-display">
            {{form.screenshotDeadline ? form.screenshotDeadline.replace('T', ' ') : '未设置'}}
          </view>
          <view class="btn-edit" @click="showDeadlinePicker = true">修改</view>
        </view>
      </view>

      <view v-if="showDeadlinePicker" class="card">
        <view class="form-row">
          <view class="form-group" style="flex:1">
            <text class="form-label">日期</text>
            <picker mode="date" :value="form.screenshotDeadline.split('T')[0]" @change="onDeadlineDateChange">
              <view class="picker">
                <text>{{form.screenshotDeadline.split('T')[0]}}</text>
                <text>▼</text>
              </view>
            </picker>
          </view>
          <view class="form-group" style="flex:1;margin-left:20rpx">
            <text class="form-label">时间</text>
            <picker mode="time" :value="form.screenshotDeadline.split('T')[1] || '00:00'" @change="onDeadlineTimeChange">
              <view class="picker">
                <text>{{form.screenshotDeadline.split('T')[1] || '00:00'}}</text>
                <text>▼</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="btn-row">
          <view class="btn-confirm" @click="showDeadlinePicker = false">确定</view>
        </view>
      </view>

      <view class="form-group">
        <text class="form-label">备注</text>
        <textarea class="form-textarea" v-model="form.notes" placeholder="选填" />
      </view>
    </view>

    <view class="submit-bar">
      <view class="btn-primary" @click="submit">保存修改</view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();

export default {
  data() {
    return {
      matchId: '',
      form: {
        title: '',
        date: '',
        time: '20:00',
        location: '',
        latitude: null,
        longitude: null,
        maxPlayers: 14,
        notes: '',
        needScreenshot: true,
        screenshotDeadline: ''
      },
      showDeadlinePicker: false,
      isAdmin: false
    }
  },
  onLoad(options) {
    this.matchId = options.id;
    this.checkAdmin().then(() => {
      if (!this.isAdmin) {
        uni.showModal({ title: '无权限', content: '仅管理员可编辑场次', showCancel: false, success: () => uni.navigateBack() });
        return;
      }
      this.loadMatchData();
    });
  },
  methods: {
    async checkAdmin() {
      try { const { result } = await wx.cloud.callFunction({ name: 'login' }); this.isAdmin = result.isAdmin || false; }
      catch (e) { this.isAdmin = false; }
    },
    async loadMatchData() {
      wx.showLoading({ title: '加载中' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'updateMatch',
          data: { action: 'get', matchId: this.matchId }
        });
        if (result.success && result.match) {
          const data = result.match;
          this.form = {
            title: data.title || '',
            date: data.date || '',
            time: data.time || '20:00',
            location: data.location || '',
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            maxPlayers: data.maxPlayers || 14,
            notes: data.notes || '',
            needScreenshot: data.needScreenshot !== false,
            screenshotDeadline: data.screenshotDeadline || ''
          };
        } else {
          uni.showToast({ title: '加载失败', icon: 'none' });
        }
      } catch (e) {
        console.error('加载失败', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      }
      wx.hideLoading();
    },
    onDateChange(e) { this.form.date = e.detail.value; },
    onTimeChange(e) { this.form.time = e.detail.value; },
    chooseLocation() {
      wx.chooseLocation({
        success: (res) => {
          this.form.location = res.name || res.address || '';
          this.form.latitude = res.latitude;
          this.form.longitude = res.longitude;
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes('cancel')) return;
          uni.showModal({ title: '地图选点失败', content: '请手动输入地点', showCancel: false, confirmText: '手动输入' });
        }
      });
    },
    onDeadlineDateChange(e) {
      const date = e.detail.value;
      const time = this.form.screenshotDeadline.split('T')[1] || '00:00';
      this.form.screenshotDeadline = `${date}T${time}`;
    },
    onDeadlineTimeChange(e) {
      const time = e.detail.value;
      const date = this.form.screenshotDeadline.split('T')[0] || this.form.date;
      this.form.screenshotDeadline = `${date}T${time}`;
    },
    handleSwitchChange(e) { this.form.needScreenshot = e.detail.value; },
    async submit() {
      if (!this.form.title.trim()) { uni.showToast({ title: '请输入场次名称', icon: 'none' }); return; }
      
      const data = {
        title: this.form.title.trim(),
        date: this.form.date,
        time: this.form.time,
        location: this.form.location.trim(),
        notes: this.form.notes.trim(),
        maxPlayers: parseInt(this.form.maxPlayers) || 14,
        needScreenshot: this.form.needScreenshot
      };
      if (this.form.latitude) data.latitude = this.form.latitude;
      if (this.form.longitude) data.longitude = this.form.longitude;
      if (this.form.needScreenshot && this.form.screenshotDeadline) {
        data.screenshotDeadline = this.form.screenshotDeadline;
      } else {
        data.screenshotDeadline = null;
      }
      
      wx.showLoading({ title: '保存中' });
      try {
        await wx.cloud.callFunction({ name: 'updateMatch', data: { matchId: this.matchId, updateData: data } });
        uni.showToast({ title: '保存成功' });
        setTimeout(() => uni.navigateBack(), 800);
      } catch (e) {
        console.error('保存失败', e);
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
      wx.hideLoading();
    }
  }
};
</script>

<style scoped>
.container { padding: 20rpx; background: #f8fafc; min-height: 100vh; }
.card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); position: relative; overflow: hidden; }
.card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4rpx; background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.form-group { margin-bottom: 24rpx; }
.form-group:last-child { margin-bottom: 0; }
.form-label { display: block; font-size: 28rpx; font-weight: 700; color: #374151; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 80rpx; background: #f8fafc; border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: #1e293b; box-sizing: border-box; border: 2rpx solid #e2e8f0; }
.form-textarea { width: 100%; height: 160rpx; background: #f8fafc; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: #1e293b; box-sizing: border-box; border: 2rpx solid #e2e8f0; }
.form-row { display: flex; gap: 20rpx; }
.picker { display: flex; justify-content: space-between; align-items: center; height: 80rpx; background: #f8fafc; border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: #1e293b; border: 2rpx solid #e2e8f0; }
.picker-placeholder { color: #94a3b8; }
.location-row { display: flex; gap: 12rpx; }
.location-input { flex: 1; }
.btn-map { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; padding: 0 20rpx; height: 80rpx; display: flex; align-items: center; border-radius: 12rpx; font-size: 26rpx; font-weight: 600; flex-shrink: 0; }
.switch-row { display: flex; justify-content: space-between; align-items: center; height: 80rpx; background: #f8fafc; border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: #1e293b; border: 2rpx solid #e2e8f0; }
.deadline-row { display: flex; justify-content: space-between; align-items: center; }
.deadline-display { flex: 1; font-size: 28rpx; color: #1e293b; padding: 20rpx; background: #f8fafc; border-radius: 12rpx; border: 2rpx solid #e2e8f0; }
.btn-edit { background: #eff6ff; color: #3b82f6; padding: 16rpx 24rpx; border-radius: 12rpx; font-size: 26rpx; font-weight: 600; margin-left: 12rpx; flex-shrink: 0; }
.btn-row { display: flex; gap: 16rpx; margin-top: 20rpx; }
.btn-confirm { flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-align: center; padding: 20rpx 0; border-radius: 12rpx; font-size: 28rpx; font-weight: 700; }
.submit-bar { padding: 20rpx; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-align: center; padding: 28rpx 0; border-radius: 16rpx; font-size: 32rpx; font-weight: 700; }
</style>
