<template>
  <view class="container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading">正在加载...</view>

    <!-- 管理员编辑其他球员 -->
    <view v-else-if="editPlayerId && (isAdmin || isSuperAdmin)" class="card">
      <view class="profile-header">
        <view class="avatar" v-if="form.avatar">
          <image :src="form.avatar" mode="aspectFill" style="width:100%;height:100%;border-radius:50%" />
        </view>
        <view class="avatar" v-else>{{form.nickname?.[0] || '?'}}</view>
        <view class="profile-text">
          <view class="profile-title">编辑球员资料</view>
          <view class="profile-sub">{{form.nickname || '未命名'}}</view>
        </view>
      </view>

      <view class="form-group">
        <text class="form-label">头像</text>
        <view class="avatar-row">
          <view class="avatar-selector" @click="chooseAvatarFromAlbum('my')">
            <view class="avatar-preview" v-if="form.avatar">
              <image :src="form.avatar" mode="aspectFill" class="avatar-img" />
            </view>
            <view class="avatar-preview" v-else>
              <text class="avatar-placeholder">{{form.nickname?.[0] || '?'}}</text>
            </view>
            <text class="avatar-hint">从相册选择</text>
          </view>
          <button class="avatar-wechat-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar($event, 'my')">
            <text>使用微信头像</text>
          </button>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="form.name" placeholder="真实姓名" />
      </view>
      <view class="form-group">
        <text class="form-label">昵称</text>
        <input class="form-input" v-model="form.nickname" placeholder="场上称呼" />
      </view>
      <view class="form-group">
        <text class="form-label">康体通后四位</text>
        <input class="form-input" v-model="form.kttLast4" placeholder="后四位" maxlength="4" type="number" />
      </view>
      <view class="form-group">
        <text class="form-label">出生年月</text>
        <picker mode="date" fields="month" :value="form.birthDate" @change="onBirthDateChange">
          <view class="picker">
            <text :class="{'picker-placeholder': !form.birthDate}">{{form.birthDate || '选择出生年月'}}</text>
            <text>▼</text>
          </view>
        </picker>
        <view class="privacy-toggle" @click="form.hideBirthDate = !form.hideBirthDate">
          <text :class="{'selected': form.hideBirthDate}">{{form.hideBirthDate ? '✅ 已设置：不在个人页面显示年龄' : '☐ 不在个人页面显示年龄'}}</text>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">初始评分</text>
        <view class="slider-marks">
          <view class="slider-mark" v-for="i in 10" :key="i" :class="{'active': (form.initialRating || 5) >= i}" @click="form.initialRating = i">
            {{i}}
          </view>
        </view>
        <view class="slider-value">当前：{{form.initialRating || 5}} 分</view>
      </view>
      <view class="form-group">
        <text class="form-label">评分权限</text>
        <view class="rating-permission-row">
          <view class="rating-permission-option" :class="{'selected': form.allowRating !== false}" @click="form.allowRating = true">
            <text>✅ 允许队友评分</text>
          </view>
          <view class="rating-permission-option" :class="{'selected': form.allowRating === false}" @click="form.allowRating = false">
            <text>🚫 不接受评分</text>
          </view>
        </view>
        <view class="rating-permission-hint">不接受评分的球员不会在评分列表中显示，仅由管理员评分</view>
      </view>
      <view class="form-group">
        <text class="form-label">擅长位置</text>
        <view class="position-grid">
          <view class="position-item" v-for="pos in POSITIONS" :key="pos.id" :class="{'selected': form.positions.includes(pos.id), 'preferred': form.preferredPosition === pos.id}" @click="togglePosition(pos.id)">
            <text>{{pos.icon}}</text>
            <text>{{pos.name}}</text>
            <text v-if="form.preferredPosition === pos.id" class="pref-tag">首选</text>
          </view>
        </view>
      </view>
      <view class="form-group" v-if="form.positions.length > 0">
        <text class="form-label">首选位置（自动分队优先参考）</text>
        <picker mode="selector" :range="POSITIONS.filter(p => form.positions.includes(p.id)).map(p => p.icon + ' ' + p.name)" :value="0" @change="onPreferredPositionChange">
          <view class="picker">
            <text :class="{'picker-placeholder': !form.preferredPosition}">
              {{form.preferredPosition ? (POSITIONS.find(p => p.id === form.preferredPosition)?.icon + ' ' + POSITIONS.find(p => p.id === form.preferredPosition)?.name) : '选择首选位置'}}
            </text>
            <text>▼</text>
          </view>
        </picker>
      </view>
      <view class="form-row">
        <view class="form-group" style="flex:1">
          <text class="form-label">身高(cm)</text>
          <input class="form-input" v-model="form.height" placeholder="170" type="number" />
          <view class="privacy-toggle" @click="form.hideHeight = !form.hideHeight">
            <text :class="{'selected': form.hideHeight}">{{form.hideHeight ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
          </view>
        </view>
        <view class="form-group" style="flex:1;margin-left:20rpx">
          <text class="form-label">体重(kg)</text>
          <input class="form-input" v-model="form.weight" placeholder="70" type="number" />
          <view class="privacy-toggle" @click="form.hideWeight = !form.hideWeight">
            <text :class="{'selected': form.hideWeight}">{{form.hideWeight ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
          </view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">惯用脚</text>
        <view class="foot-row">
          <view class="foot-option" :class="{'selected': form.foot === '左脚'}" @click="form.foot = '左脚'">左脚</view>
          <view class="foot-option" :class="{'selected': form.foot === '右脚'}" @click="form.foot = '右脚'">右脚</view>
          <view class="foot-option" :class="{'selected': form.foot === '左右脚'}" @click="form.foot = '左右脚'">左右脚</view>
        </view>
        <view class="privacy-toggle" @click="form.hideFoot = !form.hideFoot">
          <text :class="{'selected': form.hideFoot}">{{form.hideFoot ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
        </view>
      </view>

      <view class="submit-bar">
        <view class="btn-primary" @click="updateMyPlayer">保存修改</view>
      </view>
    </view>

    <!-- 已经是球员，显示编辑 -->
    <view v-else-if="myPlayer" class="card">
      <view class="profile-header">
        <view class="avatar" v-if="form.avatar">
          <image :src="form.avatar" mode="aspectFill" style="width:100%;height:100%;border-radius:50%" />
        </view>
        <view class="avatar" v-else>{{myPlayer.nickname?.[0] || '?'}}</view>
        <view class="profile-text">
          <view class="profile-title">我的球员资料</view>
          <view class="profile-sub">{{myPlayer.nickname}}</view>
        </view>
      </view>

      <view class="form-group">
        <text class="form-label">头像</text>
        <view class="avatar-row">
          <view class="avatar-selector" @click="chooseAvatarFromAlbum('my')">
            <view class="avatar-preview" v-if="form.avatar">
              <image :src="form.avatar" mode="aspectFill" class="avatar-img" />
            </view>
            <view class="avatar-preview" v-else>
              <text class="avatar-placeholder">{{form.nickname?.[0] || '?'}}</text>
            </view>
            <text class="avatar-hint">从相册选择</text>
          </view>
          <button class="avatar-wechat-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar($event, 'my')">
            <text>使用微信头像</text>
          </button>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="form.name" placeholder="真实姓名" />
      </view>
      <view class="form-group">
        <text class="form-label">昵称</text>
        <input class="form-input" v-model="form.nickname" placeholder="场上称呼" />
      </view>
      <view class="form-group">
        <text class="form-label">康体通后四位</text>
        <input class="form-input" v-model="form.kttLast4" placeholder="后四位" maxlength="4" type="number" />
      </view>
      <view class="form-group">
        <text class="form-label">出生年月</text>
        <picker mode="date" fields="month" :value="form.birthDate" @change="onBirthDateChange">
          <view class="picker">
            <text :class="{'picker-placeholder': !form.birthDate}">{{form.birthDate || '选择出生年月'}}</text>
            <text>▼</text>
          </view>
        </picker>
        <view class="privacy-toggle" @click="form.hideBirthDate = !form.hideBirthDate">
          <text :class="{'selected': form.hideBirthDate}">{{form.hideBirthDate ? '✅ 已设置：不在个人页面显示年龄' : '☐ 不在个人页面显示年龄'}}</text>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">初始评分</text>
        <view class="slider-marks">
          <view class="slider-mark" v-for="i in 10" :key="i" :class="{'active': (form.initialRating || 5) >= i}" @click="form.initialRating = i">
            {{i}}
          </view>
        </view>
        <view class="slider-value">当前：{{form.initialRating || 5}} 分</view>
      </view>
      <view class="form-group">
        <text class="form-label">评分权限</text>
        <view class="rating-permission-row">
          <view class="rating-permission-option" :class="{'selected': form.allowRating !== false}" @click="form.allowRating = true">
            <text>✅ 允许队友评分</text>
          </view>
          <view class="rating-permission-option" :class="{'selected': form.allowRating === false}" @click="form.allowRating = false">
            <text>🚫 不接受评分</text>
          </view>
        </view>
        <view class="rating-permission-hint">不接受评分的球员不会在评分列表中显示，仅由管理员评分</view>
      </view>
      <view class="form-group">
        <text class="form-label">擅长位置</text>
        <view class="position-grid">
          <view class="position-item" v-for="pos in POSITIONS" :key="pos.id" :class="{'selected': form.positions.includes(pos.id), 'preferred': form.preferredPosition === pos.id}" @click="togglePosition(pos.id)">
            <text>{{pos.icon}}</text>
            <text>{{pos.name}}</text>
            <text v-if="form.preferredPosition === pos.id" class="pref-tag">首选</text>
          </view>
        </view>
      </view>
      <view class="form-group" v-if="form.positions.length > 0">
        <text class="form-label">首选位置（自动分队优先参考）</text>
        <picker mode="selector" :range="POSITIONS.filter(p => form.positions.includes(p.id)).map(p => p.icon + ' ' + p.name)" :value="0" @change="onPreferredPositionChange">
          <view class="picker">
            <text :class="{'picker-placeholder': !form.preferredPosition}">
              {{form.preferredPosition ? (POSITIONS.find(p => p.id === form.preferredPosition)?.icon + ' ' + POSITIONS.find(p => p.id === form.preferredPosition)?.name) : '选择首选位置'}}
            </text>
            <text>▼</text>
          </view>
        </picker>
      </view>
      <view class="form-row">
        <view class="form-group" style="flex:1">
          <text class="form-label">身高(cm)</text>
          <input class="form-input" v-model="form.height" placeholder="170" type="number" />
          <view class="privacy-toggle" @click="form.hideHeight = !form.hideHeight">
            <text :class="{'selected': form.hideHeight}">{{form.hideHeight ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
          </view>
        </view>
        <view class="form-group" style="flex:1;margin-left:20rpx">
          <text class="form-label">体重(kg)</text>
          <input class="form-input" v-model="form.weight" placeholder="70" type="number" />
          <view class="privacy-toggle" @click="form.hideWeight = !form.hideWeight">
            <text :class="{'selected': form.hideWeight}">{{form.hideWeight ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
          </view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">惯用脚</text>
        <view class="foot-row">
          <view class="foot-option" :class="{'selected': form.foot === '左脚'}" @click="form.foot = '左脚'">左脚</view>
          <view class="foot-option" :class="{'selected': form.foot === '右脚'}" @click="form.foot = '右脚'">右脚</view>
          <view class="foot-option" :class="{'selected': form.foot === '左右脚'}" @click="form.foot = '左右脚'">左右脚</view>
        </view>
        <view class="privacy-toggle" @click="form.hideFoot = !form.hideFoot">
          <text :class="{'selected': form.hideFoot}">{{form.hideFoot ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
        </view>
      </view>

      <view class="submit-bar">
        <view class="btn-primary" @click="updateMyPlayer">保存修改</view>
      </view>
    </view>

    <!-- 不是球员，显示创建 -->
    <view v-else class="card">
      <view class="welcome">
        <view class="welcome-icon">👋</view>
        <view class="welcome-title">欢迎加入</view>
        <view class="welcome-text">填写你的资料，成为野球队一员</view>
      </view>

      <view class="form-group">
        <text class="form-label">头像</text>
        <view class="avatar-row">
          <view class="avatar-selector" @click="chooseAvatarFromAlbum('my')">
            <view class="avatar-preview" v-if="form.avatar">
              <image :src="form.avatar" mode="aspectFill" class="avatar-img" />
            </view>
            <view class="avatar-preview" v-else>
              <text class="avatar-placeholder">{{form.nickname?.[0] || '?'}}</text>
            </view>
            <text class="avatar-hint">从相册选择</text>
          </view>
          <button class="avatar-wechat-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar($event, 'my')">
            <text>使用微信头像</text>
          </button>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="form.name" placeholder="真实姓名" />
      </view>
      <view class="form-group">
        <text class="form-label">昵称</text>
        <input class="form-input" v-model="form.nickname" type="nickname" placeholder="点击获取微信昵称或手动输入" />
      </view>
      <view class="form-group">
        <text class="form-label">康体通后四位</text>
        <input class="form-input" v-model="form.kttLast4" placeholder="后四位" maxlength="4" type="number" />
      </view>
      <view class="form-group">
        <text class="form-label">出生年月</text>
        <picker mode="date" fields="month" :value="form.birthDate" @change="onBirthDateChange">
          <view class="picker">
            <text :class="{'picker-placeholder': !form.birthDate}">{{form.birthDate || '选择出生年月'}}</text>
            <text>▼</text>
          </view>
        </picker>
        <view class="privacy-toggle" @click="form.hideBirthDate = !form.hideBirthDate">
          <text :class="{'selected': form.hideBirthDate}">{{form.hideBirthDate ? '✅ 已设置：不在个人页面显示年龄' : '☐ 不在个人页面显示年龄'}}</text>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">初始评分</text>
        <view class="slider-marks">
          <view class="slider-mark" v-for="i in 10" :key="i" :class="{'active': (form.initialRating || 5) >= i}" @click="form.initialRating = i">
            {{i}}
          </view>
        </view>
        <view class="slider-value">当前：{{form.initialRating || 5}} 分</view>
      </view>
      <view class="form-group">
        <text class="form-label">评分权限</text>
        <view class="rating-permission-row">
          <view class="rating-permission-option" :class="{'selected': form.allowRating !== false}" @click="form.allowRating = true">
            <text>✅ 允许队友评分</text>
          </view>
          <view class="rating-permission-option" :class="{'selected': form.allowRating === false}" @click="form.allowRating = false">
            <text>🚫 不接受评分</text>
          </view>
        </view>
        <view class="rating-permission-hint">不接受评分的球员不会在评分列表中显示，仅由管理员评分</view>
      </view>
      <view class="form-group">
        <text class="form-label">擅长位置</text>
        <view class="position-grid">
          <view class="position-item" v-for="pos in POSITIONS" :key="pos.id" :class="{'selected': form.positions.includes(pos.id), 'preferred': form.preferredPosition === pos.id}" @click="togglePosition(pos.id)">
            <text>{{pos.icon}}</text>
            <text>{{pos.name}}</text>
            <text v-if="form.preferredPosition === pos.id" class="pref-tag">首选</text>
          </view>
        </view>
      </view>
      <view class="form-group" v-if="form.positions.length > 0">
        <text class="form-label">首选位置（自动分队优先参考）</text>
        <picker mode="selector" :range="POSITIONS.filter(p => form.positions.includes(p.id)).map(p => p.icon + ' ' + p.name)" :value="0" @change="onPreferredPositionChange">
          <view class="picker">
            <text :class="{'picker-placeholder': !form.preferredPosition}">
              {{form.preferredPosition ? (POSITIONS.find(p => p.id === form.preferredPosition)?.icon + ' ' + POSITIONS.find(p => p.id === form.preferredPosition)?.name) : '选择首选位置'}}
            </text>
            <text>▼</text>
          </view>
        </picker>
      </view>
      <view class="form-row">
        <view class="form-group" style="flex:1">
          <text class="form-label">身高(cm)</text>
          <input class="form-input" v-model="form.height" placeholder="170" type="number" />
          <view class="privacy-toggle" @click="form.hideHeight = !form.hideHeight">
            <text :class="{'selected': form.hideHeight}">{{form.hideHeight ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
          </view>
        </view>
        <view class="form-group" style="flex:1;margin-left:20rpx">
          <text class="form-label">体重(kg)</text>
          <input class="form-input" v-model="form.weight" placeholder="70" type="number" />
          <view class="privacy-toggle" @click="form.hideWeight = !form.hideWeight">
            <text :class="{'selected': form.hideWeight}">{{form.hideWeight ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
          </view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">惯用脚</text>
        <view class="foot-row">
          <view class="foot-option" :class="{'selected': form.foot === '左脚'}" @click="form.foot = '左脚'">左脚</view>
          <view class="foot-option" :class="{'selected': form.foot === '右脚'}" @click="form.foot = '右脚'">右脚</view>
          <view class="foot-option" :class="{'selected': form.foot === '左右脚'}" @click="form.foot = '左右脚'">左右脚</view>
        </view>
        <view class="privacy-toggle" @click="form.hideFoot = !form.hideFoot">
          <text :class="{'selected': form.hideFoot}">{{form.hideFoot ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
        </view>
      </view>

      <view class="submit-bar">
        <view class="btn-primary" @click="createMyPlayer">创建我的资料</view>
      </view>
    </view>

    <!-- 管理员区域：添加其他球员 -->
    <view v-if="isAdmin && !editPlayerId" class="card admin-section">
      <view class="section-title">👔 管理员：添加其他球员</view>
      <view class="form-group">
        <text class="form-label">头像</text>
        <view class="avatar-row">
          <view class="avatar-selector" @click="chooseAvatarFromAlbum('admin')">
            <view class="avatar-preview" v-if="adminForm.avatar">
              <image :src="adminForm.avatar" mode="aspectFill" class="avatar-img" />
            </view>
            <view class="avatar-preview" v-else>
              <text class="avatar-placeholder">{{adminForm.nickname?.[0] || '?'}}</text>
            </view>
            <text class="avatar-hint">从相册选择</text>
          </view>
          <button class="avatar-wechat-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar($event, 'admin')">
            <text>使用微信头像</text>
          </button>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="adminForm.name" placeholder="真实姓名" />
      </view>
      <view class="form-group">
        <text class="form-label">昵称</text>
        <input class="form-input" v-model="adminForm.nickname" placeholder="场上称呼" />
      </view>
      <view class="form-group">
        <text class="form-label">康体通后四位</text>
        <input class="form-input" v-model="adminForm.kttLast4" placeholder="后四位" maxlength="4" type="number" />
      </view>
      <view class="form-group">
        <text class="form-label">出生年月</text>
        <picker mode="date" fields="month" :value="adminForm.birthDate" @change="onAdminBirthDateChange">
          <view class="picker">
            <text :class="{'picker-placeholder': !adminForm.birthDate}">{{adminForm.birthDate || '选择出生年月'}}</text>
            <text>▼</text>
          </view>
        </picker>
        <view class="privacy-toggle" @click="adminForm.hideBirthDate = !adminForm.hideBirthDate">
          <text :class="{'selected': adminForm.hideBirthDate}">{{adminForm.hideBirthDate ? '✅ 已设置：不在个人页面显示年龄' : '☐ 不在个人页面显示年龄'}}</text>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">初始评分</text>
        <view class="slider-marks">
          <view class="slider-mark" v-for="i in 10" :key="i" :class="{'active': (adminForm.initialRating || 5) >= i}" @click="adminForm.initialRating = i">
            {{i}}
          </view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">评分权限</text>
        <view class="rating-permission-row">
          <view class="rating-permission-option" :class="{'selected': adminForm.allowRating !== false}" @click="adminForm.allowRating = true">
            <text>✅ 允许队友评分</text>
          </view>
          <view class="rating-permission-option" :class="{'selected': adminForm.allowRating === false}" @click="adminForm.allowRating = false">
            <text>🚫 不接受评分</text>
          </view>
        </view>
        <view class="rating-permission-hint">不接受评分的球员不会在评分列表中显示，仅由管理员评分</view>
      </view>
      <view class="form-group">
        <text class="form-label">擅长位置</text>
        <view class="position-grid">
          <view class="position-item" v-for="pos in POSITIONS" :key="pos.id" :class="{'selected': adminForm.positions.includes(pos.id), 'preferred': adminForm.preferredPosition === pos.id}" @click="toggleAdminPosition(pos.id)">
            <text>{{pos.icon}}</text>
            <text>{{pos.name}}</text>
            <text v-if="adminForm.preferredPosition === pos.id" class="pref-tag">首选</text>
          </view>
        </view>
      </view>
      <view class="form-group" v-if="adminForm.positions.length > 0">
        <text class="form-label">首选位置（自动分队优先参考）</text>
        <picker mode="selector" :range="POSITIONS.filter(p => adminForm.positions.includes(p.id)).map(p => p.icon + ' ' + p.name)" :value="0" @change="onAdminPreferredPositionChange">
          <view class="picker">
            <text :class="{'picker-placeholder': !adminForm.preferredPosition}">
              {{adminForm.preferredPosition ? (POSITIONS.find(p => p.id === adminForm.preferredPosition)?.icon + ' ' + POSITIONS.find(p => p.id === adminForm.preferredPosition)?.name) : '选择首选位置'}}
            </text>
            <text>▼</text>
          </view>
        </picker>
      </view>
      <view class="form-row">
        <view class="form-group" style="flex:1">
          <text class="form-label">身高(cm)</text>
          <input class="form-input" v-model="adminForm.height" placeholder="170" type="number" />
          <view class="privacy-toggle" @click="adminForm.hideHeight = !adminForm.hideHeight">
            <text :class="{'selected': adminForm.hideHeight}">{{adminForm.hideHeight ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
          </view>
        </view>
        <view class="form-group" style="flex:1;margin-left:20rpx">
          <text class="form-label">体重(kg)</text>
          <input class="form-input" v-model="adminForm.weight" placeholder="70" type="number" />
          <view class="privacy-toggle" @click="adminForm.hideWeight = !adminForm.hideWeight">
            <text :class="{'selected': adminForm.hideWeight}">{{adminForm.hideWeight ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
          </view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">惯用脚</text>
        <view class="foot-row">
          <view class="foot-option" :class="{'selected': adminForm.foot === '左脚'}" @click="adminForm.foot = '左脚'">左脚</view>
          <view class="foot-option" :class="{'selected': adminForm.foot === '右脚'}" @click="adminForm.foot = '右脚'">右脚</view>
          <view class="foot-option" :class="{'selected': adminForm.foot === '左右脚'}" @click="adminForm.foot = '左右脚'">左右脚</view>
        </view>
        <view class="privacy-toggle" @click="adminForm.hideFoot = !adminForm.hideFoot">
          <text :class="{'selected': adminForm.hideFoot}">{{adminForm.hideFoot ? '✅ 已隐藏' : '☐ 隐藏'}}</text>
        </view>
      </view>
      <view class="btn-secondary" style="margin-top:16rpx" @click="createOtherPlayer">为他人创建资料</view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();
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
      POSITIONS,
      loading: true,
      myPlayer: null,
      isAdmin: false,
      isSuperAdmin: false,
      editPlayerId: '',
      editPlayer: null,
      form: { name: '', nickname: '', kttLast4: '', birthDate: '', positions: [], preferredPosition: '', initialRating: 5, avatar: '', allowRating: true, hideBirthDate: false, hideHeight: false, hideWeight: false, hideFoot: false, height: '', weight: '', foot: '' },
      adminForm: { name: '', nickname: '', kttLast4: '', birthDate: '', positions: [], preferredPosition: '', initialRating: 5, avatar: '', allowRating: true, hideBirthDate: false, hideHeight: false, hideWeight: false, hideFoot: false, height: '', weight: '', foot: '' },
    }
  },
  onLoad(options) {
    this.editPlayerId = options.playerId || '';
    this.checkUser();
  },
  methods: {
    async checkUser() {
      this.loading = true;
      try {
        // 1. 获取 openid 和身份
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        const openid = result.openid;
        this.openid = openid;
        this.isAdmin = result.isAdmin || false;
        this.isSuperAdmin = result.isSuperAdmin || false;

        // 2. 如果传入 playerId 且是管理员，加载该球员信息
        if (this.editPlayerId && (this.isAdmin || this.isSuperAdmin)) {
          const { data } = await db.collection('players').doc(this.editPlayerId).get();
          this.editPlayer = data;
          this.form = {
            name: data.name || '',
            nickname: data.nickname || '',
            kttLast4: data.kttLast4 || '',
            birthDate: data.birthDate || '',
            positions: data.positions || [],
            preferredPosition: data.preferredPosition || '',
            initialRating: (data.ratings?.initialRating) || 5,
            allowRating: data.allowRating !== false,
            hideBirthDate: data.hideBirthDate || false,
            hideHeight: data.hideHeight || false,
            hideWeight: data.hideWeight || false,
            hideFoot: data.hideFoot || false,
            avatar: data.avatar || '',
            height: data.height || '',
            weight: data.weight || '',
            foot: data.foot || '',
          };
          this.loading = false;
          return;
        }

        // 3. 检查是否已有球员（自己的资料）
        const { data: myList } = await db.collection('players').where({ _openid: openid }).get();
        if (myList.length > 0) {
          this.myPlayer = myList[0];
          this.form = {
            name: myList[0].name,
            nickname: myList[0].nickname,
            kttLast4: myList[0].kttLast4 || '',
            birthDate: myList[0].birthDate || '',
            positions: myList[0].positions || [],
            preferredPosition: myList[0].preferredPosition || '',
            initialRating: (myList[0].ratings?.initialRating) || 5,
            allowRating: myList[0].allowRating !== false,
            hideBirthDate: myList[0].hideBirthDate || false,
            hideHeight: myList[0].hideHeight || false,
            hideWeight: myList[0].hideWeight || false,
            hideFoot: myList[0].hideFoot || false,
            avatar: myList[0].avatar || '',
            height: myList[0].height || '',
            weight: myList[0].weight || '',
            foot: myList[0].foot || '',
          };
        }
      } catch (e) {
        console.error('检查用户失败', e);
      }
      this.loading = false;
    },
    togglePosition(id) {
      const idx = this.form.positions.indexOf(id);
      if (idx >= 0) {
        this.form.positions.splice(idx, 1);
        if (this.form.preferredPosition === id) this.form.preferredPosition = '';
      } else {
        this.form.positions.push(id);
      }
    },
    toggleAdminPosition(id) {
      const idx = this.adminForm.positions.indexOf(id);
      if (idx >= 0) {
        this.adminForm.positions.splice(idx, 1);
        if (this.adminForm.preferredPosition === id) this.adminForm.preferredPosition = '';
      } else {
        this.adminForm.positions.push(id);
      }
    },
    chooseAvatarFromAlbum(type) {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (imgRes) => {
          wx.showLoading({ title: '上传中' });
          try {
            const uploadRes = await wx.cloud.uploadFile({
              cloudPath: `avatars/${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`,
              filePath: imgRes.tempFilePaths[0]
            });
            if (type === 'my') this.form.avatar = uploadRes.fileID;
            else this.adminForm.avatar = uploadRes.fileID;
          } catch (e) {
            console.error('头像上传失败', e);
            uni.showToast({ title: '上传失败', icon: 'none' });
          }
          wx.hideLoading();
        }
      });
    },
    async onChooseAvatar(e, type) {
      const tempFilePath = e.detail?.avatarUrl;
      if (!tempFilePath) {
        uni.showToast({ title: '未获取到头像', icon: 'none' });
        return;
      }
      wx.showLoading({ title: '上传中' });
      try {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`,
          filePath: tempFilePath
        });
        if (type === 'my') this.form.avatar = uploadRes.fileID;
        else this.adminForm.avatar = uploadRes.fileID;
        uni.showToast({ title: '头像已设置', icon: 'none' });
      } catch (e) {
        console.error('头像上传失败', e);
        uni.showToast({ title: '上传失败', icon: 'none' });
      }
      wx.hideLoading();
    },
    onBirthDateChange(e) {
      this.form.birthDate = e.detail.value;
    },
    onAdminBirthDateChange(e) {
      this.adminForm.birthDate = e.detail.value;
    },
    onPreferredPositionChange(e) {
      const selected = this.POSITIONS.filter(p => this.form.positions.includes(p.id))[e.detail.value];
      if (selected) this.form.preferredPosition = selected.id;
    },
    onAdminPreferredPositionChange(e) {
      const selected = this.POSITIONS.filter(p => this.adminForm.positions.includes(p.id))[e.detail.value];
      if (selected) this.adminForm.preferredPosition = selected.id;
    },
    async createMyPlayer() {
      if (!this.form.nickname.trim()) {
        uni.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '创建中', mask: true });
      const ir = this.form.initialRating || 5;
      const compositeRating = Math.min(10, Math.max(1, Math.round((ir * 0.8 + 1) * 10) / 10));
      try {
        await db.collection('players').add({
          data: {
            name: this.form.name.trim(),
            nickname: this.form.nickname.trim(),
            kttLast4: this.form.kttLast4 || '',
            birthDate: this.form.birthDate || '',
            positions: this.form.positions,
            preferredPosition: this.form.preferredPosition || '',
            avatar: this.form.avatar || '',
            allowRating: this.form.allowRating !== false,
            hideBirthDate: this.form.hideBirthDate || false,
            hideHeight: this.form.hideHeight || false,
            hideWeight: this.form.hideWeight || false,
            hideFoot: this.form.hideFoot || false,
            height: this.form.height || '',
            weight: this.form.weight || '',
            foot: this.form.foot || '',
            ratings: {
              initialRating: ir,
              peerRatings: [],
              adminRatings: []
            },
            stats: {
              appearances: 0, goals: 0, assists: 0, wins: 0, draws: 0, losses: 0,
              yellowCards: 0, redCards: 0, ownGoals: 0, rating: compositeRating,
              ownerCount: 0, assistantCount: 0,
              adminAvg: ir,
              peerAvg: ir,
              performanceRating: 5
            },
            createdAt: new Date()
          }
        });
        uni.hideLoading();
        uni.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => {
          this.checkUser();
          const pages = getCurrentPages();
          if (pages.length > 1) {
            uni.navigateBack();
          }
        }, 800);
      } catch (e) {
        console.error(e);
        uni.hideLoading();
        uni.showToast({ title: '创建失败：' + (e.message || e.errMsg || ''), icon: 'none', duration: 3000 });
      }
    },
    async updateMyPlayer() {
      if (!this.form.nickname.trim()) {
        uni.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      const targetId = this.editPlayerId || this.myPlayer?._id;
      if (!targetId) {
        uni.showToast({ title: '无法确定更新目标', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '保存中', mask: true });
      try {
        await db.collection('players').doc(targetId).update({
          data: {
            name: this.form.name.trim(),
            nickname: this.form.nickname.trim(),
            kttLast4: this.form.kttLast4 || '',
            birthDate: this.form.birthDate || '',
            positions: this.form.positions,
            preferredPosition: this.form.preferredPosition || '',
            allowRating: this.form.allowRating !== false,
            hideBirthDate: this.form.hideBirthDate || false,
            hideHeight: this.form.hideHeight || false,
            hideWeight: this.form.hideWeight || false,
            hideFoot: this.form.hideFoot || false,
            'ratings.initialRating': this.form.initialRating || 5,
            avatar: this.form.avatar || '',
            height: this.form.height || '',
            weight: this.form.weight || '',
            foot: this.form.foot || '',
          }
        });
        uni.hideLoading();
        uni.showToast({ title: '保存成功', icon: 'success' });
        if (this.editPlayerId) {
          setTimeout(() => uni.navigateBack(), 800);
        }
      } catch (e) {
        console.error(e);
        uni.hideLoading();
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
    },
    async createOtherPlayer() {
      if (!this.adminForm.nickname.trim()) {
        uni.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '创建中', mask: true });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'createPlayer',
          data: {
            name: this.adminForm.name.trim(),
            nickname: this.adminForm.nickname.trim(),
            kttLast4: this.adminForm.kttLast4 || '',
            birthDate: this.adminForm.birthDate || '',
            positions: this.adminForm.positions,
            preferredPosition: this.adminForm.preferredPosition || '',
            avatar: this.adminForm.avatar || '',
            initialRating: this.adminForm.initialRating || 5,
            allowRating: this.adminForm.allowRating !== false,
            hideBirthDate: this.adminForm.hideBirthDate || false,
            hideHeight: this.adminForm.hideHeight || false,
            hideWeight: this.adminForm.hideWeight || false,
            hideFoot: this.adminForm.hideFoot || false,
            height: this.adminForm.height || '',
            weight: this.adminForm.weight || '',
            foot: this.adminForm.foot || ''
          }
        });
        if (result.success) {
          uni.hideLoading();
          uni.showToast({ title: '添加成功', icon: 'success' });
          this.adminForm = { name: '', nickname: '', kttLast4: '', birthDate: '', positions: [], initialRating: 5, avatar: '', allowRating: true };
        } else {
          uni.hideLoading();
          uni.showToast({ title: result.error || '添加失败', icon: 'none' });
        }
      } catch (e) {
        console.error(e);
        uni.hideLoading();
        uni.showToast({ title: '添加失败', icon: 'none' });
      }
    }
  }
}
</script>

<style scoped>
.container { padding: 20rpx; padding-bottom: 40rpx; }
.loading { text-align: center; padding: 200rpx 40rpx; font-size: 28rpx; color: #9ca3af; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.profile-header { display: flex; align-items: center; margin-bottom: 24rpx; padding-bottom: 24rpx; border-bottom: 2rpx solid #f3f4f6; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: #dcfce7; color: #166534; font-weight: 700; font-size: 40rpx; display: flex; align-items: center; justify-content: center; margin-right: 24rpx; }
.profile-text { flex: 1; }
.profile-title { font-size: 32rpx; font-weight: 700; color: #111827; }
.profile-sub { font-size: 28rpx; color: #6b7280; margin-top: 4rpx; }
.welcome { text-align: center; padding: 40rpx 0; margin-bottom: 24rpx; }
.welcome-icon { font-size: 64rpx; margin-bottom: 16rpx; }
.welcome-title { font-size: 36rpx; font-weight: 700; color: #111827; }
.welcome-text { font-size: 26rpx; color: #6b7280; margin-top: 8rpx; }
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #6b7280; margin-bottom: 12rpx; display: block; }
.form-input { width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; font-size: 30rpx; box-sizing: border-box; }
.slider-marks { display: flex; justify-content: space-between; gap: 8rpx; }
.slider-mark { width: 64rpx; height: 64rpx; border-radius: 12rpx; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #9ca3af; font-weight: 600; }
.slider-mark.active { background: #fbbf24; color: #fff; }
.slider-value { font-size: 28rpx; color: #6b7280; margin-top: 12rpx; text-align: center; }
.position-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.position-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 20rpx; border-radius: 12rpx; background: #f3f4f6; font-size: 26rpx; }
.position-item.selected { background: #dcfce7; color: #166534; border: 2rpx solid #16a34a; }
.submit-bar { padding: 20rpx 0; }
.btn-primary { background: #16a34a; color: #fff; border-radius: 16rpx; padding: 28rpx 0; text-align: center; font-weight: 600; font-size: 32rpx; }
.btn-secondary { background: #f3f4f6; color: #374151; border-radius: 16rpx; padding: 24rpx 0; text-align: center; font-weight: 600; font-size: 30rpx; }
.admin-section { border: 2rpx solid #e5e7eb; }
.section-title { font-size: 30rpx; font-weight: 700; margin-bottom: 20rpx; }
.picker { width: 100%; height: 80rpx; padding: 0 24rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; font-size: 30rpx; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; color: #374151; }
.picker-placeholder { color: #9ca3af; }

.rating-permission-row { display: flex; gap: 16rpx; }
.rating-permission-option { flex: 1; padding: 20rpx; border-radius: 12rpx; background: #f3f4f6; text-align: center; font-size: 26rpx; color: #6b7280; }
.rating-permission-option.selected { background: #dcfce7; color: #166534; border: 2rpx solid #16a34a; }
.rating-permission-hint { font-size: 22rpx; color: #9ca3af; margin-top: 8rpx; }

.avatar-row { display: flex; align-items: center; gap: 20rpx; }
.avatar-selector { display: flex; align-items: center; gap: 20rpx; }
.avatar-preview { width: 120rpx; height: 120rpx; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; }
.avatar-placeholder { font-size: 48rpx; font-weight: 700; color: #166534; }
.avatar-hint { font-size: 26rpx; color: #6b7280; }
.avatar-wechat-btn { margin: 0; padding: 20rpx 32rpx; background: #f3f4f6; border-radius: 12rpx; font-size: 26rpx; color: #374151; line-height: 1.5; }
.position-item.preferred { background: #fef3c7; border: 2rpx solid #f59e0b; position: relative; }
.pref-tag { position: absolute; top: 4rpx; right: 4rpx; font-size: 18rpx; background: #f59e0b; color: #fff; padding: 2rpx 8rpx; border-radius: 8rpx; }
.privacy-toggle { margin-top: 12rpx; padding: 16rpx; border-radius: 12rpx; background: #f3f4f6; font-size: 26rpx; color: #6b7280; }
.privacy-toggle text.selected { color: #166534; }
.foot-row { display: flex; gap: 20rpx; }
.foot-option { flex: 1; padding: 20rpx 0; text-align: center; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; color: #666; background: #f0f0f0; border: 2rpx solid transparent; }
.foot-option.selected { background: #e8f0fe; color: #667eea; border-color: #667eea; }
.avatar-wechat-btn::after { border: none; }
</style>