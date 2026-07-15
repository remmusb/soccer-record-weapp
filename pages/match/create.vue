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

      <view class="form-row">
        <view class="form-group" style="flex:1">
          <text class="form-label">结束时间</text>
          <picker mode="time" :value="form.endTime" @change="onEndTimeChange">
            <view class="picker">
              <text :class="{'picker-placeholder': !form.endTime}">{{form.endTime || '选择结束时间'}}</text>
              <text>▼</text>
            </view>
          </picker>
          <text class="hint-text">默认开始时间+1.5小时</text>
        </view>
        <view class="form-group" style="flex:1;margin-left:20rpx"></view>
      </view>

      <view class="form-group">
        <text class="form-label">地点</text>
        <view class="location-row">
          <input class="form-input location-input" v-model="form.location" placeholder="如 XX足球场" />
          <view class="btn-map" @click="chooseLocation">📍 地图选点</view>
        </view>
        <view v-if="form.latitude && form.longitude" class="hint-text">
          坐标: {{form.latitude.toFixed(4)}}, {{form.longitude.toFixed(4)}}
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
        <text class="hint-text">默认比赛日前13天24点，可手动调整</text>
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
          <view class="btn-reset" @click="calcScreenshotDeadline(); showDeadlinePicker = false">恢复默认</view>
        </view>
      </view>

      <view class="form-group">
        <text class="form-label">备注</text>
        <textarea class="form-textarea" v-model="form.notes" placeholder="选填" />
      </view>

      <!-- 场主和护法选择 -->
      <view class="form-group">
        <text class="form-label">场主</text>
        <view class="picker" @click="pickOwner">
          <text :class="{'picker-placeholder': !form.ownerId}">{{ownerName || '选择场主'}}</text>
          <text>▼</text>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">护法</text>
        <view v-if="form.assistantIds.length > 0" class="assistants-tags">
          <view class="assistant-tag" v-for="pid in form.assistantIds" :key="pid">
            {{playersMap[pid]?.nickname || '?'}}
            <text class="tag-remove" @click="removeAssistant(pid)">✕</text>
          </view>
        </view>
        <view v-else class="picker-placeholder" style="padding:20rpx 0">未选择护法</view>
        <view class="btn-add-assistant" @click="pickAssistant">➕ 添加护法</view>
      </view>

      <view class="form-row">
        <view class="form-group" style="flex:1">
          <text class="form-label">A队名称</text>
          <input class="form-input" v-model="form.teamAName" placeholder="如 🔴 红队" />
        </view>
        <view class="form-group" style="flex:1;margin-left:20rpx">
          <text class="form-label">B队名称</text>
          <input class="form-input" v-model="form.teamBName" placeholder="如 🔵 蓝队" />
        </view>
      </view>
    </view>

    <view class="submit-bar">
      <view class="btn-primary" @click="submit">{{editMode ? '保存修改' : '创建场次'}}</view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();

export default {
  data() {
    return {
      form: {
        title: '',
        date: '',
        time: '18:30',
        endTime: '',
        location: '',
        latitude: null,
        longitude: null,
        maxPlayers: 14,
        notes: '',
        needScreenshot: true,
        screenshotDeadline: '',
        teamAName: '蓝队',
        teamBName: '白队',
        ownerId: '',
        assistantIds: []
      },
      playersList: [],
      playersMap: {},
      showDeadlinePicker: false,
      editMode: false,
      editMatchId: '',
      isAdmin: false
    }
  },
  onLoad(options) {
    this.checkAdmin().then(() => {
      if (!this.isAdmin && !options.edit) {
        uni.showModal({
          title: '无权限',
          content: '仅管理员可创建场次',
          showCancel: false,
          success: () => uni.navigateBack()
        });
        return;
      }
      this.loadPlayersList();
      if (options.id && options.edit) {
        this.editMode = true;
        this.editMatchId = options.id;
        this.loadMatchData();
      } else {
        this.initDate();
        this.calcEndTime();
      }
    });
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
    async loadPlayersList() {
      try {
        const { result } = await wx.cloud.callFunction({ name: 'getPlayers' });
        this.playersList = (result.players || []).filter(p => p && p._id);
        this.playersMap = {};
        this.playersList.forEach(p => { this.playersMap[p._id] = p; });
      } catch (e) {
        console.error('加载球员列表失败', e);
      }
    },
    async loadMatchData() {
      wx.showLoading({ title: '加载中' });
      try {
        const { data } = await db.collection('matches').doc(this.editMatchId).get();
        this.form = {
          title: data.title || '',
          date: data.date || '',
          time: data.time || '20:00',
          endTime: data.endTime || '',
          location: data.location || '',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          maxPlayers: data.maxPlayers || 14,
          notes: data.notes || '',
          needScreenshot: data.needScreenshot !== false,
          screenshotDeadline: data.screenshotDeadline || '',
          teamAName: data.teamA?.name || 'A队',
          teamBName: data.teamB?.name || 'B队',
          ownerId: data.ownerId || '',
          assistantIds: data.assistantIds || []
        };
      } catch (e) {
        console.error('加载失败', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      }
      wx.hideLoading();
    },
    initDate() {
      const d = new Date();
      d.setDate(d.getDate() + 13);
      this.form.date = d.toISOString().split('T')[0];
      this.calcScreenshotDeadline();
    },
    calcEndTime() {
      const [h, m] = this.form.time.split(':');
      let endH = parseInt(h) + 1;
      let endM = parseInt(m) + 30;
      if (endM >= 60) { endH += 1; endM -= 60; }
      this.form.endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    },
    onDateChange(e) {
      this.form.date = e.detail.value;
      if (!this.editMode) this.calcScreenshotDeadline();
    },
    onTimeChange(e) {
      this.form.time = e.detail.value;
      if (!this.editMode) this.calcEndTime();
    },
    onEndTimeChange(e) {
      this.form.endTime = e.detail.value;
    },
    chooseLocation() {
      wx.chooseLocation({
        success: (res) => {
          this.form.location = res.name || res.address || '';
          this.form.latitude = res.latitude;
          this.form.longitude = res.longitude;
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes('cancel')) return;
          console.error('地图选点失败', err);
          let msg = '地图选点失败';
          let extra = '';
          if (err.errMsg && (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize'))) {
            msg = '位置权限未开启';
            extra = '请在手机设置中允许小程序使用位置权限';
          } else if (err.errMsg && err.errMsg.includes('permission')) {
            msg = '小程序未开通地理位置接口';
            extra = '需在小程序后台「开发管理→接口设置」中申请开通「获取用户位置信息」接口，审核通过后即可使用';
          }
          uni.showModal({
            title: msg,
            content: (extra ? extra + '。' : '') + '您也可以直接手动输入地点',
            showCancel: false,
            confirmText: '手动输入'
          });
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
    calcScreenshotDeadline() {
      if (!this.form.date) return;
      const matchDate = new Date(this.form.date);
      const deadline = new Date(matchDate.getTime() - 13 * 24 * 60 * 60 * 1000);
      deadline.setHours(24, 0, 0, 0);
      const y = deadline.getFullYear();
      const m = String(deadline.getMonth() + 1).padStart(2, '0');
      const d = String(deadline.getDate()).padStart(2, '0');
      this.form.screenshotDeadline = `${y}-${m}-${d}T00:00`;
    },
    handleSwitchChange(e) {
      this.form.needScreenshot = e.detail.value;
    },
    async submit() {
      if (!this.form.title.trim()) {
        uni.showToast({ title: '请输入场次名称', icon: 'none' });
        return;
      }
      
      const data = {
        title: this.form.title.trim(),
        date: this.form.date,
        time: this.form.time,
        location: this.form.location.trim(),
        notes: this.form.notes.trim(),
        maxPlayers: parseInt(this.form.maxPlayers) || 14,
        needScreenshot: this.form.needScreenshot,
        ownerId: this.form.ownerId || '',
        assistantIds: this.form.assistantIds || []
      };
      if (this.form.endTime) data.endTime = this.form.endTime;
      if (this.form.latitude) data.latitude = this.form.latitude;
      if (this.form.longitude) data.longitude = this.form.longitude;
      if (this.form.needScreenshot && this.form.screenshotDeadline) {
        data.screenshotDeadline = this.form.screenshotDeadline;
      } else {
        data.screenshotDeadline = null;
      }
      
      // 内容安全检查
      wx.showLoading({ title: '安全检查中' });
      try {
        const checkFields = [
          { key: 'title', value: data.title },
          { key: 'location', value: data.location },
          { key: 'notes', value: data.notes },
        ];
        for (const field of checkFields) {
          if (field.value) {
            const { result } = await wx.cloud.callFunction({
              name: 'securityCheck',
              data: { content: field.value }
            });
            if (result && !result.safe) {
              wx.hideLoading();
              uni.showModal({
                title: '内容安全检查未通过',
                content: `${field.key === 'title' ? '场次名称' : field.key === 'location' ? '地点' : '备注'}含有违规信息，请修改后重试。`,
                showCancel: false
              });
              return;
            }
          }
        }
      } catch (e) {
        console.error('内容安全检查失败:', e);
        // 安全检查失败不阻塞，继续保存
      }
      
      wx.showLoading({ title: this.editMode ? '保存中' : '创建中' });
      try {
        if (this.editMode) {
          data['teamA.name'] = this.form.teamAName || '蓝队';
          data['teamB.name'] = this.form.teamBName || '白队';
          
          // 先获取旧数据，检查人数上限是否变化
          const { data: oldMatch } = await db.collection('matches').doc(this.editMatchId).get();
          const oldMaxPlayers = oldMatch.maxPlayers || 14;
          const newMaxPlayers = this.form.maxPlayers || 14;
          
          await db.collection('matches').doc(this.editMatchId).update({ data });
          uni.showToast({ title: '保存成功' });
          
          // 如果人数上限有变化，重新处理名单
          if (oldMaxPlayers !== newMaxPlayers) {
            wx.showLoading({ title: '重新确认名单中' });
            try {
              const { result } = await wx.cloud.callFunction({
                name: 'processRegistration',
                data: { matchId: this.editMatchId }
              });
              if (result.success) {
                uni.showToast({ title: '名单已重新确认' });
                // 只给状态有变化的球员发送通知
                const changedIds = [...(result.changed || [])];
                if (changedIds.length > 0) {
                  try {
                    await wx.cloud.callFunction({
                      name: 'sendNotification',
                      data: { type: 'confirmed', matchId: this.editMatchId, playerIds: changedIds }
                    });
                  } catch (e) { console.error('重新确认通知发送失败', e); }
                }
              } else {
                uni.showToast({ title: '名单重新确认失败', icon: 'none' });
              }
            } catch (e) {
              console.error('重新确认名单失败', e);
              uni.showToast({ title: '名单重新确认失败', icon: 'none' });
            }
            wx.hideLoading();
          }
          
          // 修改比赛信息也发送通知
          try {
            await wx.cloud.callFunction({
              name: 'sendNotification',
              data: { type: 'new_match', matchId: this.editMatchId, customMessage: '场次信息已更新，请查看最新安排' }
            });
          } catch (e) { console.error('场次更新通知发送失败', e); }
          
          setTimeout(() => uni.navigateBack(), 800);
        } else {
          data.status = 'upcoming';
          data.registrations = [];
          data.registrationClosed = false;
          data.teamA = { players: [], score: 0, color: '', captainId: '', name: this.form.teamAName || '蓝队' };
          data.teamB = { players: [], score: 0, color: '', captainId: '', name: this.form.teamBName || '白队' };
          data.events = [];
          data.teamConfirmed = false;
          data.createdAt = db.serverDate();
          const res = await db.collection('matches').add({ data });
          const newMatchId = res._id;
          uni.showToast({ title: '创建成功' });
          
          // 发送新场次通知（静默失败，不阻塞用户）
          try {
            await wx.cloud.callFunction({
              name: 'sendNotification',
              data: { type: 'new_match', matchId: newMatchId }
            });
          } catch (e) { console.error('新场次通知发送失败', e); }
          
          setTimeout(() => uni.navigateBack(), 800);
        }
      } catch (e) {
        console.error(this.editMode ? '保存失败' : '创建失败', e);
        uni.showToast({ title: (this.editMode ? '保存' : '创建') + '失败：' + (e.message || e.errMsg || ''), icon: 'none' });
      }
      wx.hideLoading();
    },
    // 选择场主
    pickOwner() {
      const names = this.playersList.map(p => p.nickname || p.name || '未知');
      const ids = this.playersList.map(p => p._id);
      uni.showActionSheet({
        itemList: names,
        success: (res) => {
          this.form.ownerId = ids[res.tapIndex];
        }
      });
    },
    // 添加护法
    pickAssistant() {
      const available = this.playersList.filter(p => p._id !== this.form.ownerId && !this.form.assistantIds.includes(p._id));
      if (available.length === 0) {
        uni.showToast({ title: '没有可选球员', icon: 'none' });
        return;
      }
      const names = available.map(p => p.nickname || p.name || '未知');
      const ids = available.map(p => p._id);
      uni.showActionSheet({
        itemList: names,
        success: (res) => {
          this.form.assistantIds.push(ids[res.tapIndex]);
        }
      });
    },
    // 移除护法
    removeAssistant(pid) {
      this.form.assistantIds = this.form.assistantIds.filter(id => id !== pid);
    }
  },
  computed: {
    ownerName() {
      return this.playersMap[this.form.ownerId]?.nickname || '';
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  padding-bottom: 40rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}

.form-row {
  display: flex;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 26rpx;
  color: #6b7280;
  margin-bottom: 12rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  padding: 16rpx 24rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  font-size: 30rpx;
  box-sizing: border-box;
  min-height: 160rpx;
}

.picker {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  font-size: 30rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #374151;
}

.picker-placeholder {
  color: #9ca3af;
}

.switch-row {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  font-size: 30rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #374151;
}

.deadline-display {
  font-size: 28rpx;
  color: #374151;
  padding: 20rpx 24rpx;
  background: #f9fafb;
  border-radius: 12rpx;
}

.submit-bar {
  padding: 20rpx 0;
}

.btn-primary {
  background: #16a34a;
  color: #fff;
  border-radius: 16rpx;
  padding: 28rpx 0;
  text-align: center;
  font-weight: 600;
  font-size: 32rpx;
}

.btn-primary:active {
  opacity: 0.9;
}

.hint-text {
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 8rpx;
  display: block;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.location-input {
  flex: 1;
}

.btn-map {
  background: #3b82f6;
  color: #fff;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.deadline-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.deadline-row .deadline-display {
  flex: 1;
}

.btn-edit {
  background: #f3f4f6;
  color: #374151;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-row {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.btn-confirm, .btn-reset {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.btn-confirm {
  background: #16a34a;
  color: #fff;
}

.btn-reset {
  background: #f3f4f6;
  color: #374151;
}

/* 场主和护法 */
.assistants-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.assistant-tag {
  background: #e0e7ff;
  color: #4338ca;
  padding: 10rpx 20rpx;
  border-radius: 10rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.tag-remove {
  color: #dc2626;
  font-weight: 700;
  margin-left: 8rpx;
}
.btn-add-assistant {
  background: #f0fdf4;
  color: #16a34a;
  border: 2rpx solid #bbf7d0;
  border-radius: 12rpx;
  padding: 16rpx 0;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
}
</style>
