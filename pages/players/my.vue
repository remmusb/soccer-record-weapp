<template>
  <view class="container">
    <!-- 未注册：欢迎视图 -->
    <view class="welcome-section" v-if="!user._id">
      <view class="welcome-card">
        <view class="welcome-title">欢迎来到球队记录</view>
        <view class="welcome-desc">注册成为球员，记录你的足球生涯</view>
      </view>

      <!-- 注册表单 -->
      <view class="form-card">
        <view class="card-title">球员注册</view>
        <view class="form-item">
          <text class="label">昵称</text>
          <input v-model="form.nickname" placeholder="请输入昵称" maxlength="20" />
        </view>
        <view class="form-item">
          <text class="label">姓名</text>
          <input v-model="form.name" placeholder="请输入真实姓名" maxlength="20" />
        </view>
        <view class="form-item">
          <text class="label">头像</text>
          <view class="avatar-section">
            <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">使用微信头像</button>
            <button class="avatar-btn" @click="chooseAvatarFromAlbum">从相册选择</button>
            <image v-if="form.avatarUrl" class="avatar-preview" :src="form.avatarUrl" mode="aspectFill" />
          </view>
        </view>
        <view class="form-item">
          <text class="label">生日</text>
          <picker mode="date" :value="form.birthDate" @change="onBirthDateChange">
            <view class="picker">{{ form.birthDate || '请选择生日' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">擅长位置（可多选）</text>
          <view class="position-tags">
            <view class="position-tag" :class="{ active: (form.positions || []).includes('GK') }" @click="togglePosition('GK')">🧤 门将</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CB') }" @click="togglePosition('CB')">🛡️ 中后卫</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('LB') }" @click="togglePosition('LB')">⬅️ 左后卫</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('RB') }" @click="togglePosition('RB')">➡️ 右后卫</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CDM') }" @click="togglePosition('CDM')">⚓ 后腰</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CM') }" @click="togglePosition('CM')">⚙️ 中场</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CAM') }" @click="togglePosition('CAM')">🎨 前腰</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('LW') }" @click="togglePosition('LW')">↖️ 左边锋</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('RW') }" @click="togglePosition('RW')">↗️ 右边锋</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('ST') }" @click="togglePosition('ST')">⚽ 前锋</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CF') }" @click="togglePosition('CF')">🎯 中锋</view>
          </view>
          <text v-if="form.positions && form.positions.length > 0" style="font-size:22rpx;color:#667eea;margin-top:8rpx">已选: {{ form.positions.join('、') }}</text>
        </view>
        <view class="form-row">
          <view class="form-group" style="flex:1">
            <text class="label">身高(cm)</text>
            <input v-model="form.height" placeholder="170" type="number" />
          </view>
          <view class="form-group" style="flex:1;margin-left:20rpx">
            <text class="label">体重(kg)</text>
            <input v-model="form.weight" placeholder="70" type="number" />
          </view>
        </view>
        <view class="form-item">
          <text class="label">主力脚</text>
          <view class="foot-row">
            <view class="foot-option" :class="{selected: form.foot === '左脚'}" @click="form.foot = '左脚'">左脚</view>
            <view class="foot-option" :class="{selected: form.foot === '右脚'}" @click="form.foot = '右脚'">右脚</view>
            <view class="foot-option" :class="{selected: form.foot === '左右脚'}" @click="form.foot = '左右脚'">左右脚</view>
          </view>
        </view>
        <view class="form-item agreement-row">
          <view class="agreement-checkbox" :class="{'checked': form.agreeTerms}" @click="form.agreeTerms = !form.agreeTerms">
            <text v-if="form.agreeTerms">✅</text>
            <text v-else>⬜</text>
          </view>
          <view class="agreement-text">
            <text>我已阅读并同意</text>
            <text class="agreement-link" @click.stop="goAgreement">《用户服务协议》</text>
            <text>和</text>
            <text class="agreement-link" @click.stop="goPrivacy">《隐私政策》</text>
          </view>
        </view>
        <button class="submit-btn" @click="saveNewPlayer">注册</button>
      </view>
    </view>

    <!-- 已注册：个人资料页 -->
    <view class="profile-section" v-else>
      <!-- 编辑模式 -->
      <view class="form-card" v-if="editing">
        <view class="card-title">编辑资料</view>
        <view class="form-item">
          <text class="label">昵称</text>
          <input v-model="form.nickname" placeholder="请输入昵称" maxlength="20" />
        </view>
        <view class="form-item">
          <text class="label">姓名</text>
          <input v-model="form.name" placeholder="请输入真实姓名" maxlength="20" />
        </view>
        <view class="form-item">
          <text class="label">头像</text>
          <view class="avatar-section">
            <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">使用微信头像</button>
            <button class="avatar-btn" @click="chooseAvatarFromAlbum">从相册选择</button>
            <image v-if="form.avatarUrl" class="avatar-preview" :src="form.avatarUrl" mode="aspectFill" />
          </view>
        </view>
        <view class="form-item">
          <text class="label">生日</text>
          <picker mode="date" :value="form.birthDate" @change="onBirthDateChange">
            <view class="picker">{{ form.birthDate || '请选择生日' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">擅长位置（可多选）</text>
          <view class="position-tags">
            <view class="position-tag" :class="{ active: (form.positions || []).includes('GK') }" @click="togglePosition('GK')">🧤 门将</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CB') }" @click="togglePosition('CB')">🛡️ 中后卫</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('LB') }" @click="togglePosition('LB')">⬅️ 左后卫</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('RB') }" @click="togglePosition('RB')">➡️ 右后卫</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CDM') }" @click="togglePosition('CDM')">⚓ 后腰</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CM') }" @click="togglePosition('CM')">⚙️ 中场</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CAM') }" @click="togglePosition('CAM')">🎨 前腰</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('LW') }" @click="togglePosition('LW')">↖️ 左边锋</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('RW') }" @click="togglePosition('RW')">↗️ 右边锋</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('ST') }" @click="togglePosition('ST')">⚽ 前锋</view>
            <view class="position-tag" :class="{ active: (form.positions || []).includes('CF') }" @click="togglePosition('CF')">🎯 中锋</view>
          </view>
          <text v-if="form.positions && form.positions.length > 0" style="font-size:22rpx;color:#667eea;margin-top:8rpx">已选: {{ form.positions.join('、') }}</text>
        </view>
        <view class="form-row">
          <view class="form-group" style="flex:1">
            <text class="label">身高(cm)</text>
            <input v-model="form.height" placeholder="170" type="number" />
          </view>
          <view class="form-group" style="flex:1;margin-left:20rpx">
            <text class="label">体重(kg)</text>
            <input v-model="form.weight" placeholder="70" type="number" />
          </view>
        </view>
        <view class="form-item">
          <text class="label">主力脚</text>
          <view class="foot-row">
            <view class="foot-option" :class="{selected: form.foot === '左脚'}" @click="form.foot = '左脚'">左脚</view>
            <view class="foot-option" :class="{selected: form.foot === '右脚'}" @click="form.foot = '右脚'">右脚</view>
            <view class="foot-option" :class="{selected: form.foot === '左右脚'}" @click="form.foot = '左右脚'">左右脚</view>
          </view>
        </view>
        <view class="form-item">
          <text class="label">允许他人评分</text>
          <view class="rating-permission-row">
            <view class="rating-permission-option" :class="{selected: form.allowRating}" @click="form.allowRating = true">允许</view>
            <view class="rating-permission-option" :class="{selected: !form.allowRating}" @click="form.allowRating = false">不允许</view>
          </view>
        </view>
        <view class="btn-group">
          <button class="cancel-btn" @click="cancelEdit">取消</button>
          <button class="submit-btn" @click="saveProfile">保存</button>
        </view>
      </view>

      <!-- 查看模式 -->
      <block v-else>
        <!-- 个人资料卡片 -->
        <view class="profile-card">
          <view class="profile-header">
            <image class="avatar" :src="user.avatar || '/static/default-avatar.png'" mode="aspectFill" />
            <view class="profile-info">
              <view class="nickname">{{ user.nickname }}</view>
              <view class="name">{{ user.name }}</view>
              <view class="positions">
                <text v-for="pos in user.positions" :key="pos" class="position-tag">{{ positionMap[pos] || pos }}</text>
              </view>
              <view v-if="user.height || user.weight || user.foot" class="physical-info">
                <text v-if="user.height">📏 {{user.height}}cm</text>
                <text v-if="user.weight">⚖️ {{user.weight}}kg</text>
                <text v-if="user.foot">🦶 {{user.foot}}</text>
              </view>
            </view>
            <view class="edit-btn" @click="goEdit">编辑</view>
          </view>
        </view>

        <!-- 数据统计 -->
        <view class="stats-card">
          <view class="card-title">我的数据</view>
          <view class="stats-grid">
            <view class="stat-item">
              <view class="stat-value">{{ stats.games || 0 }}</view>
              <view class="stat-label">场次</view>
            </view>
            <view class="stat-item">
              <view class="stat-value">{{ stats.goals || 0 }}</view>
              <view class="stat-label">进球</view>
            </view>
            <view class="stat-item">
              <view class="stat-value">{{ stats.assists || 0 }}</view>
              <view class="stat-label">助攻</view>
            </view>
            <view class="stat-item">
              <view class="stat-value">{{ stats.mvp || 0 }}</view>
              <view class="stat-label">MVP</view>
            </view>
          </view>
        </view>

        <!-- 订阅设置 -->
        <view class="subscription-card">
          <view class="card-title">订阅设置</view>
          <view class="sub-item">
            <view class="sub-info">
              <text class="sub-title">比赛提醒</text>
              <text class="sub-desc">比赛开始前接收通知</text>
            </view>
            <switch :checked="subscribed" @change="requestSubscribeAuth" color="#667eea" />
          </view>
        </view>

        <!-- 设置入口 -->
        <view class="settings-entry" @click="goSettings">
          <view class="settings-left">
            <text class="settings-icon">⚙</text>
            <text class="settings-text">设置</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </block>
    </view>
  </view>
</template>

<script>
const POSITIONS = [
  { id: 'GK', name: '门将', icon: '🧤' },
  { id: 'CB', name: '中后卫', icon: '🛡️' },
  { id: 'LB', name: '左后卫', icon: '⬅️' },
  { id: 'RB', name: '右后卫', icon: '➡️' },
  { id: 'CDM', name: '后腰', icon: '⚓' },
  { id: 'CM', name: '中场', icon: '⚙️' },
  { id: 'CAM', name: '前腰', icon: '🎨' },
  { id: 'LW', name: '左边锋', icon: '↖️' },
  { id: 'RW', name: '右边锋', icon: '↗️' },
  { id: 'ST', name: '前锋', icon: '⚽' },
  { id: 'CF', name: '中锋', icon: '🎯' },
];

export default {
  data() {
    return {
      user: {},
      form: {
        nickname: '',
        name: '',
        avatarUrl: '',
        birthDate: '',
        positions: []
      },
      editing: false,
      stats: { games: 0, goals: 0, assists: 0, mvp: 0 },
      subscribed: false
    };
  },

  computed: {
    positionMap() {
      const map = {};
      POSITIONS.forEach(p => {
        map[p.id] = p.name;
      });
      return map;
    }
  },

  onShow() {
    this.loadUser();
  },

  onShareAppMessage() {
    return {
      title: '我的球员档案',
      path: '/pages/players/my'
    };
  },

  methods: {
    async loadUser() {
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' });
        const openid = loginRes.result.openid;
        
        const { result } = await wx.cloud.callFunction({ name: 'getPlayers' });
        const allPlayers = result.players || [];
        const myList = allPlayers.filter(p => p._openid === openid);
        if (myList.length > 0) {
          this.user = myList[0];
          // 兼容 avatar 和 avatarUrl 字段
          if (!this.user.avatarUrl && this.user.avatar) {
            this.user.avatarUrl = this.user.avatar;
          }
          this.stats = myList[0].stats || {
            games: 0, goals: 0, assists: 0, mvp: 0
          };
          this.subscribed = myList[0].subscribed || false;
        }
      } catch (e) {
        console.error('加载用户信息失败:', e);
      }
    },

    goEdit() {
      this.$set(this.form, 'nickname', this.user.nickname || '');
      this.$set(this.form, 'name', this.user.name || '');
      this.$set(this.form, 'avatarUrl', this.user.avatarUrl || this.user.avatar || '');
      this.$set(this.form, 'birthDate', this.user.birthDate || '');
      this.$set(this.form, 'positions', [...(this.user.positions || [])]);
      this.$set(this.form, 'allowRating', this.user.allowRating !== false);
      this.$set(this.form, 'height', this.user.height || '');
      this.$set(this.form, 'weight', this.user.weight || '');
      this.$set(this.form, 'foot', this.user.foot || '');
      this.editing = true;
    },

    cancelEdit() {
      this.editing = false;
    },

    async saveProfile() {
      // 内容安全检查
      wx.showLoading({ title: '安全检查中' });
      try {
        const checkFields = [
          { key: 'nickname', value: this.form.nickname.trim() },
          { key: 'name', value: this.form.name.trim() },
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
                content: `${field.key === 'nickname' ? '昵称' : '姓名'}含有违规信息，请修改后重试。`,
                showCancel: false
              });
              return;
            }
          }
        }
      } catch (e) {
        console.error('内容安全检查失败:', e);
      }

      wx.showLoading({ title: '保存中' });
      try {
        const db = wx.cloud.database();
        await db.collection('players').doc(this.user._id).update({
          data: {
            name: this.form.name.trim(),
            nickname: this.form.nickname.trim(),
            avatar: this.form.avatarUrl || '',
            birthDate: this.form.birthDate || '',
            height: this.form.height || '',
            weight: this.form.weight || '',
            foot: this.form.foot || '',
            positions: this.form.positions || [],
            allowRating: this.form.allowRating !== false
          }
        });
        uni.showToast({ title: '保存成功', icon: 'success' });
        this.editing = false;
        await this.loadUser();
      } catch (e) {
        console.error('保存失败:', e);
        uni.showToast({ title: '保存失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },

    async saveNewPlayer() {
      if (!this.form.agreeTerms) {
        uni.showToast({ title: '请先同意用户服务协议和隐私政策', icon: 'none', duration: 3000 });
        return;
      }
      // 内容安全检查
      wx.showLoading({ title: '安全检查中' });
      try {
        const checkFields = [
          { key: 'nickname', value: this.form.nickname.trim() },
          { key: 'name', value: this.form.name.trim() },
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
                content: `${field.key === 'nickname' ? '昵称' : '姓名'}含有违规信息，请修改后重试。`,
                showCancel: false
              });
              return;
            }
          }
        }
      } catch (e) {
        console.error('内容安全检查失败:', e);
      }

      wx.showLoading({ title: '注册中' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'createPlayer',
          data: {
            nickname: this.form.nickname,
            name: this.form.name,
            avatarUrl: this.form.avatarUrl,
            birthDate: this.form.birthDate,
            height: this.form.height || '',
            weight: this.form.weight || '',
            foot: this.form.foot || '',
            positions: this.form.positions,
            allowRating: this.form.allowRating !== false,
            agreeTerms: true
          }
        });
        if (result && result.success) {
          // 保存同意协议状态到本地
          wx.setStorageSync('hasAgreedTerms', true);
          uni.showToast({ title: '注册成功', icon: 'success' });
          await this.loadUser();
        } else {
          uni.showToast({ title: '注册失败', icon: 'none' });
        }
      } catch (e) {
        console.error('注册失败:', e);
        uni.showToast({ title: '注册失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },

    goAgreement() {
      uni.navigateTo({ url: '/pages/agreement/index' });
    },

    goPrivacy() {
      uni.navigateTo({ url: '/pages/privacy/index' });
    },

    async requestSubscribeAuth(e) {
      try {
        const res = await wx.requestSubscribeMessage({
          tmplIds: [
            'b__Xfgl9V5Gb4wR620BxvGwkNYUc-7GTIhMbvCaVl7Y',
            '9yHUbypikNHuoi24brxXjx1ssA23qOhL-7wkKr7Yno8'
          ]
        });
        console.log('订阅结果', res);
        const accepted = Object.values(res).some(v => v === 'accept');
        if (accepted) {
          this.subscribed = true;
          uni.showToast({ title: '授权成功', icon: 'success' });
        } else {
          uni.showToast({ title: '未授权，可在设置中开启', icon: 'none' });
        }
      } catch (e) {
        console.error('订阅授权失败', e);
        uni.showToast({ title: '授权失败', icon: 'none' });
      }
    },

    chooseAvatarFromAlbum() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFiles[0].tempFilePath;
          this.uploadAvatar(tempFilePath);
        },
        fail: (e) => {
          console.error('选择图片失败:', e);
        }
      });
    },

    onChooseAvatar(e) {
      const { avatarUrl } = e.detail;
      if (avatarUrl) {
        this.uploadAvatar(avatarUrl);
      }
    },

    onBirthDateChange(e) {
      this.form.birthDate = e.detail.value;
    },

    togglePosition(pos) {
      if (!this.form.positions) {
        this.$set(this.form, 'positions', []);
      }
      const index = this.form.positions.indexOf(pos);
      if (index > -1) {
        this.form.positions.splice(index, 1);
      } else {
        this.form.positions.push(pos);
      }
    },

    goSettings() {
      uni.navigateTo({
        url: '/pages/settings/index'
      });
    },

    async uploadAvatar(tempFilePath) {
      try {
        const ext = tempFilePath.split('.').pop() || 'jpg';
        const cloudPath = `avatars/${Date.now()}.${ext}`;
        const { fileID } = await wx.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath
        });
        this.form.avatarUrl = fileID;
      } catch (e) {
        console.error('上传头像失败:', e);
        uni.showToast({ title: '上传头像失败', icon: 'none' });
      }
    }
  }
};
</script>

<style>
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

/* 欢迎区域 */
.welcome-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  margin-bottom: 30rpx;
  color: #fff;
  text-align: center;
}

.welcome-title {
  font-size: 44rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.welcome-desc {
  font-size: 28rpx;
  opacity: 0.9;
}

/* 通用卡片样式 */
.form-card,
.profile-card,
.stats-card,
.subscription-card,
.settings-entry {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 32rpx;
}

/* 表单样式 */
.form-item {
  margin-bottom: 28rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
}

input,
.picker {
  border: 2rpx solid #e8e8e8;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 28rpx;
  background: #fafafa;
}

.avatar-section {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  align-items: center;
}

.avatar-btn {
  background: #f0f0f0;
  color: #666;
  font-size: 26rpx;
  padding: 16rpx 30rpx;
  border-radius: 12rpx;
  line-height: 1.5;
  margin: 0;
}

.avatar-btn::after {
  border: none;
}

.avatar-preview {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  display: block;
  margin-top: 8rpx;
  border: 2rpx solid #e8e8e8;
}

/* 位置标签 */
.position-tags {
  display: flex;
  flex-wrap: wrap;
  padding: 8rpx 0;
}

.position-tag {
  display: inline-block;
  padding: 14rpx 32rpx;
  border-radius: 32rpx;
  background: #f0f0f0;
  color: #666;
  font-size: 26rpx;
  border: 2rpx solid transparent;
  margin-right: 16rpx;
  margin-bottom: 16rpx;
}

.position-tag.active {
  background: #667eea;
  color: #fff;
  border-color: #667eea;
}

/* 按钮 */
.submit-btn {
  background: #667eea;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  margin-top: 40rpx;
  height: 96rpx;
  line-height: 96rpx;
}

.submit-btn::after {
  border: none;
}

.cancel-btn {
  background: #f0f0f0;
  color: #666;
  border-radius: 16rpx;
  font-size: 32rpx;
  height: 96rpx;
  line-height: 96rpx;
}

.cancel-btn::after {
  border: none;
}

.btn-group {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}

.btn-group button {
  flex: 1;
  margin: 0;
}

/* 个人资料卡片 */
.profile-card {
  padding: 40rpx;
}

.profile-header {
  display: flex;
  align-items: center;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 30rpx;
  border: 4rpx solid #f0f0f0;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.nickname {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.name {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.positions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.positions .position-tag {
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
  background: #e8f0fe;
  color: #667eea;
  font-size: 24rpx;
}

.edit-btn {
  color: #667eea;
  font-size: 28rpx;
  padding: 16rpx 24rpx;
  background: #f0f0f0;
  border-radius: 12rpx;
}

/* 数据统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.stat-item {
  text-align: center;
  padding: 20rpx 0;
}

.stat-value {
  font-size: 44rpx;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
}

/* 订阅设置 */
.sub-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-info {
  display: flex;
  flex-direction: column;
}

.sub-title {
  font-size: 30rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.sub-desc {
  font-size: 24rpx;
  color: #999;
}

/* 设置入口 */
.settings-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
}

.settings-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.settings-icon {
  font-size: 36rpx;
}

.settings-text {
  font-size: 30rpx;
  color: #333;
}

.arrow {
  color: #ccc;
  font-size: 40rpx;
  font-weight: bold;
}

.physical-info { display: flex; gap: 16rpx; margin-top: 12rpx; font-size: 24rpx; color: #666; }

.foot-row { display: flex; gap: 20rpx; }
.foot-option { flex: 1; padding: 20rpx 0; text-align: center; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; color: #666; background: #f0f0f0; border: 2rpx solid transparent; }
.foot-option.selected { background: #e8f0fe; color: #667eea; border-color: #667eea; }

.form-row { display: flex; gap: 20rpx; margin-bottom: 20rpx; }

/* 评分权限选择 */
.rating-permission-row { display: flex; gap: 20rpx; }
.rating-permission-option { flex: 1; padding: 20rpx 0; text-align: center; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; color: #666; background: #f0f0f0; border: 2rpx solid transparent; }
.rating-permission-option.selected { background: #e8f0fe; color: #667eea; border-color: #667eea; }

.agreement-row { display: flex; align-items: center; gap: 16rpx; margin-top: 20rpx; }
.agreement-checkbox { font-size: 36rpx; flex-shrink: 0; }
.agreement-text { font-size: 24rpx; color: #666; line-height: 1.5; }
.agreement-link { color: #667eea; }
</style>
