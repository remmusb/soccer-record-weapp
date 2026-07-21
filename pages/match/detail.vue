<template>
  <view class="container">
    <view v-if="loading" class="loading">
      <view class="loading-spinner">⚽</view>
      <view class="loading-text">加载中...</view>
    </view>
    
    <view v-else-if="match" class="match-detail">
      <!-- 比赛信息 -->
      <view class="card">
        <view class="match-header">
          <view>
            <view class="match-title">{{match.title}}<text v-if="isNew" class="new-badge">新</text></view>
            <view class="match-info">📅 {{match.date}} {{match.time}}</view>
            <view class="match-info">📍 {{match.location}}</view>
            <view class="match-info">{{statusText}}</view>
            <view v-if="match.screenshotDeadline" class="match-deadline">⏰ 截图截止：{{match.screenshotDeadline}}</view>
          </view>
          <view class="match-right">
            <view class="status-tag" :class="statusClass">{{statusLabel}}</view>
          </view>
        </view>
        
        <!-- 比分牌：与场次列表一致 -->
        <view class="match-result" v-if="match.status !== 'upcoming'">
          <view class="team-side">
            <view class="team team-a">
              <view class="team-dot" :style="{background: getTeamDotColor(match.teamA)}"></view>
              <view class="team-name">{{match.teamA?.name || 'A队'}}</view>
              <view class="team-score">{{match.teamA?.score || 0}}</view>
            </view>
            <view v-if="getTeamAGoals(match).length > 0" class="team-goals">
              <view class="team-goal-item" v-for="(g, idx) in getTeamAGoals(match)" :key="'a-'+idx">
                <text class="goal-icon">⚽</text>
                <text class="goal-player">{{getPlayerName(g.playerId)}}<text v-if="g.isOwnGoal" class="own-goal-tag">(OG)</text></text>
                <text v-if="g.assistById" class="goal-assist">🅰️ {{getPlayerName(g.assistById)}}</text>
                <text v-if="g.minute" class="goal-minute">{{g.minute}}'</text>
              </view>
            </view>
          </view>
          <view class="vs">:</view>
          <view class="team-side">
            <view class="team team-b">
              <view class="team-score">{{match.teamB?.score || 0}}</view>
              <view class="team-name">{{match.teamB?.name || 'B队'}}</view>
              <view class="team-dot" :style="{background: getTeamDotColor(match.teamB)}"></view>
            </view>
            <view v-if="getTeamBGoals(match).length > 0" class="team-goals">
              <view class="team-goal-item" v-for="(g, idx) in getTeamBGoals(match)" :key="'b-'+idx">
                <text v-if="g.minute" class="goal-minute">{{g.minute}}'</text>
                <text class="goal-icon">⚽</text>
                <text class="goal-player">{{getPlayerName(g.playerId)}}<text v-if="g.isOwnGoal" class="own-goal-tag">(OG)</text></text>
                <text v-if="g.assistById" class="goal-assist">🅰️ {{getPlayerName(g.assistById)}}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 两队队员 -->
        <view class="card" v-if="match.status !== 'upcoming'">
          <view class="lineups-header">
            <view class="lineup-tab" :class="{'active': lineupTab === 'A'}" @click="lineupTab = 'A'">
              <view class="lineup-dot" :style="{background: getTeamDotColor(match.teamA), border: getTeamDotColor(match.teamA) === '#e5e7eb' ? '2rpx solid #475569' : 'none'}"></view>
              <text>{{match.teamA?.name || 'A队'}}</text>
            </view>
            <view class="lineup-tab" :class="{'active': lineupTab === 'B'}" @click="lineupTab = 'B'">
              <view class="lineup-dot" :style="{background: getTeamDotColor(match.teamB), border: getTeamDotColor(match.teamB) === '#e5e7eb' ? '2rpx solid #475569' : 'none'}"></view>
              <text>{{match.teamB?.name || 'B队'}}</text>
            </view>
          </view>
          <view class="lineup-list">
            <view class="lineup-item" v-for="pid in (lineupTab === 'A' ? teamAPlayersFiltered : teamBPlayersFiltered)" :key="pid">
              <view class="lineup-player">{{players[pid]?.nickname || '?'}}</view>
              <view class="lineup-stats">
                <text v-if="getPlayerGoals(pid) > 0" class="stat-goal">⚽{{getPlayerGoals(pid)}}</text>
                <text v-if="getPlayerAssists(pid) > 0" class="stat-assist">🎯{{getPlayerAssists(pid)}}</text>
                <text v-if="match.status === 'completed'" class="stat-rating">{{getPlayerMatchRating(pid)?.toFixed(1) || '-'}}</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 退出报名按钮 -->
        <view class="btn-group" v-if="isRegistered && match.status === 'upcoming'">
          <view class="btn-secondary" @click="cancelRegister(currentPlayerId)">退出报名</view>
        </view>
      </view>
      
      <!-- 管理员操作（场次信息下方、接龙上方） -->
      <view class="card" v-if="isAdmin">
        <view class="section-title">🔧 管理员操作</view>
        <view class="admin-grid">
          <view class="admin-btn" v-if="match.status === 'upcoming' || isSuperAdmin" @click="goEdit">
            <text class="admin-icon">📝</text>
            <text class="admin-label">编辑信息</text>
          </view>
          <view class="admin-btn" v-if="isSuperAdmin && !isSortingMode" @click="enterSortMode">
            <text class="admin-icon">🔀</text>
            <text class="admin-label">调整排序</text>
          </view>
          <view class="admin-btn" v-if="isSuperAdmin && isSortingMode" @click="saveSortOrder">
            <text class="admin-icon">💾</text>
            <text class="admin-label">保存排序</text>
          </view>
          <view class="admin-btn" v-if="isSuperAdmin && isSortingMode" @click="cancelSortMode">
            <text class="admin-icon">❌</text>
            <text class="admin-label">取消排序</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming' && !isSortingMode" @click="confirmTeam">
            <text class="admin-icon">📋</text>
            <text class="admin-label">{{match.teamConfirmed ? '重新确认' : '确认名单'}}</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming' && !isSortingMode" @click="toggleRegistration">
            <text class="admin-icon">🔒</text>
            <text class="admin-label">{{match.registrationClosed ? '开启报名' : '关闭报名'}}</text>
          </view>
          <view class="admin-btn" v-if="!isSortingMode" @click="goTeamSplit">
            <text class="admin-icon">⚙️</text>
            <text class="admin-label">调整分队</text>
          </view>
          <view class="admin-btn" v-if="!isSortingMode" @click="goRecord">
            <text class="admin-icon">📝</text>
            <text class="admin-label">{{match.status === 'completed' ? '查看赛况' : '记录赛况'}}</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming' && !isSortingMode" @click="changeOwner">
            <text class="admin-icon">👑</text>
            <text class="admin-label">场主</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming' && !isSortingMode" @click="addAssistant">
            <text class="admin-icon">🛡️</text>
            <text class="admin-label">护法</text>
          </view>
          <view class="admin-btn" v-if="!isSortingMode" @click="adminRegister">
            <text class="admin-icon">➕</text>
            <text class="admin-label">代报名</text>
          </view>
          <view class="admin-btn" v-if="!isSortingMode" @click="addTempPlayer">
            <text class="admin-icon">👤</text>
            <text class="admin-label">临时球员</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'upcoming' && !isSortingMode" @click="startMatch">
            <text class="admin-icon">▶️</text>
            <text class="admin-label">开始比赛</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'ongoing' && !isSortingMode" @click="endMatch">
            <text class="admin-icon">⏹️</text>
            <text class="admin-label">结束比赛</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'completed' && !isSortingMode" @click="toggleRating">
            <text class="admin-icon">⭐</text>
            <text class="admin-label">{{match.ratingOpen ? '关闭评分' : '开启评分'}}</text>
          </view>
          <view class="admin-btn" v-if="!isSortingMode" @click="deleteMatch">
            <text class="admin-icon">🗑️</text>
            <text class="admin-label">删除场次</text>
          </view>
          <view class="admin-btn" v-if="match.status === 'completed' && isSuperAdmin && !isSortingMode" @click="showPeerRatingsModal">
            <text class="admin-icon">📋</text>
            <text class="admin-label">互评记录</text>
          </view>
        </view>
      </view>
      
      <!-- 消息测试（仅管理员） -->
      <view class="card" v-if="isAdmin">
        <view class="section-title">🔔 消息测试</view>
        <view class="test-grid">
          <view class="test-btn" @click="testNotify('new_match')">新场次</view>
          <view class="test-btn" @click="testNotify('confirm_team')">确认名单</view>
          <view class="test-btn" @click="testNotify('team_split')">分队</view>
          <view class="test-btn" @click="testNotify('rating_open')">评分</view>
          <view class="test-btn" @click="testNotify('owner_reminder_24h')">场主24h</view>
          <view class="test-btn" @click="testNotify('owner_reminder_3h')">场主3h</view>
          <view class="test-btn" @click="testNotify('assistant_reminder_24h')">护法24h</view>
          <view class="test-btn" @click="testNotify('assistant_reminder_3h')">护法3h</view>
        </view>
      </view>
      
      <!-- 场主/护法 -->
      <view class="card" v-if="match.ownerId || (match.assistantIds || []).length > 0">
        <view class="section-header" @click="match.status === 'completed' && toggleCollapse('owner')">
          <view class="section-title">👑 场主/护法</view>
          <text class="collapse-arrow">{{collapsedSections.owner ? '▼' : '▲'}}</text>
        </view>
        <view v-if="!collapsedSections.owner">
        <view class="owner-item">
          <text class="owner-label">场主</text>
          <text class="owner-name">{{ownerName}}</text>
          <text v-if="isAdmin" class="owner-action" @click="changeOwner">更换</text>
        </view>
        <view class="owner-item" v-for="aid in match.assistantIds || []" :key="aid">
          <text class="owner-label">护法</text>
          <text class="owner-name">{{players[aid]?.nickname || '?'}}</text>
          <text v-if="isAdmin" class="owner-action" @click="removeAssistant(aid)">移除</text>
        </view>
        <view v-if="isAdmin && (match.assistantIds || []).length < 4" class="owner-item">
          <text class="owner-label">护法</text>
          <text class="owner-action" @click="addAssistant">+ 添加</text>
        </view>
        </view>
      </view>
      
      <!-- 报名接龙 -->
      <view class="card">
        <view class="section-header" @click="match.status === 'completed' && toggleCollapse('registration')">
          <view class="section-title">👥 报名接龙</view>
          <text class="collapse-arrow">{{collapsedSections.registration ? '▼' : '▲'}}</text>
        </view>
        <view v-if="!collapsedSections.registration">
        <view class="section-count-line">{{(isSortingMode ? sortableRegistrations : sortedRegistrations).filter(r => !r.isWL).length}}/{{match.maxPlayers || 14}}人 + WL {{(isSortingMode ? sortableRegistrations : sortedRegistrations).filter(r => r.isWL).length}}</view>
        <view class="reg-list" v-if="(isSortingMode ? sortableRegistrations : sortedRegistrations).length > 0">
          <block v-for="(r, index) in (isSortingMode ? sortableRegistrations : sortedRegistrations)" :key="r.playerId">
            <view v-if="index === (match.maxPlayers || 14)" class="wl-divider">
              <view class="wl-line"></view>
              <text class="wl-text">Waiting List</text>
              <view class="wl-line"></view>
            </view>
            <view class="reg-item" :class="{'wl-item': r.isWL}">
              <view class="reg-info">
                <view class="reg-name-row">
                  <text v-if="isSortingMode" class="sort-handle" @click="moveUp(index)" :style="{opacity: index > 0 ? 1 : 0.3}">⬆️</text>
                  <text class="reg-num">{{r.displayIndex}}.</text>
                  <text v-if="r.isTempPlayer" class="temp-tag">👤</text>
                  <view class="player-name-link" @click.stop="!r.isTempPlayer && goPlayerDetail(r.playerId)">
                    {{r.isTempPlayer ? r.tempNickname : (r.player?.nickname || '未知')}}
                  </view>
                  <text v-if="r.player?.kttLast4" class="ktt-tag">({{r.player.kttLast4}})</text>
                  <text v-if="r.isWL" class="tag tag-wl">WL</text>
                  <text v-if="isSortingMode" class="sort-handle" @click="moveDown(index)" :style="{opacity: index < sortableRegistrations.length - 1 ? 1 : 0.3}">⬇️</text>
                </view>
                <view class="reg-tags">
                  <text v-if="r.isTempPlayer" class="tag tag-gray">临时</text>
                  <text v-if="match.ownerId === r.playerId" class="tag tag-yellow">👑</text>
                  <text v-if="(match.assistantIds || []).includes(r.playerId)" class="tag tag-purple">🛡️</text>
                  <text v-if="!r.isTempPlayer && isInTeamA(r.playerId)" class="tag tag-blue">{{(match.teamA?.name || 'A队').replace(/[🔴🔵]/g,'').trim()}}</text>
                  <text v-else-if="!r.isTempPlayer && isInTeamB(r.playerId)" class="tag tag-red">{{(match.teamB?.name || 'B队').replace(/[🔴🔵]/g,'').trim()}}</text>
                </view>
                <view class="reg-actions-row" v-if="!isSortingMode && (r.playerId === currentPlayerId || isAdmin)">
                  <view v-if="r.playerId === currentPlayerId && match.needScreenshot !== false && r.status !== 'cancelled'" class="btn-upload" @click="uploadScreenshot">📤 {{r.screenshot ? '重新上传' : '上传截图'}}</view>
                  <view v-if="isAdmin && r.screenshot" class="btn-preview" @click="previewScreenshot(r.screenshot)">👁️ 查看截图</view>
                  <view v-if="isAdmin && r.status !== 'confirmed' && r.status !== 'cancelled'" class="btn-confirm" @click="confirmScreenshot(r.playerId)">✅ 确认</view>
                  <view v-if="isAdmin && r.status === 'confirmed'" class="btn-cancel" @click="cancelConfirm(r.playerId)">❌ 取消确认</view>
                  <view v-if="isAdmin" class="btn-delete-reg" @click="deleteRegistration(r.playerId)">🗑️ 删除</view>
                </view>
              </view>
              <view class="reg-right" v-if="!isSortingMode">
                <text v-if="r.status === 'confirmed'" class="status-confirmed">✅</text>
                <text v-else-if="r.status === 'screenshot_uploaded'" class="status-pending">⏳</text>
                <text v-else-if="r.status === 'pending_screenshot'" class="status-pending">⏳</text>
                <text v-else-if="r.status === 'cancelled'" class="status-cancelled">❌</text>
              </view>
            </view>
          </block>
        </view>
        <view v-else class="empty-state">暂无报名</view>
        
        <view class="btn-group" v-if="!isRegistered && match.status === 'upcoming' && !match.registrationClosed">
          <view class="btn-primary" @click="showRegister">我要报名</view>
        </view>
        </view>
      </view>
      
      <!-- A队赛况 -->
      <view class="card" v-if="teamAEvents.length > 0">
        <view class="section-title">{{match.teamA?.name || 'A队'}} 赛况</view>
        <view class="event-list">
          <view class="event-item" v-for="e in teamAEvents" :key="e.id">
            <view class="event-time">{{e.minute}}'</view>
            <view class="event-detail">
              <text v-if="e.type === 'goal'">⚽ {{players[e.playerId]?.nickname}} 进球<text v-if="e.assistById"> ({{getPlayerName(e.assistById)}} 助攻)</text></text>
              <text v-else-if="e.type === 'assist'">🎯 助攻: {{players[e.playerId]?.nickname}}</text>
              <text v-else-if="e.type === 'yellow'">🟨 {{players[e.playerId]?.nickname}} 黄牌</text>
              <text v-else-if="e.type === 'red'">🟥 {{players[e.playerId]?.nickname}} 红牌</text>
              <text v-else-if="e.type === 'ownGoal' || e.type === 'own_goal'">⚽ {{players[e.playerId]?.nickname}} 乌龙(OG)</text>
            </view>
          </view>
        </view>
      </view>

      <!-- B队赛况 -->
      <view class="card" v-if="teamBEvents.length > 0">
        <view class="section-title">{{match.teamB?.name || 'B队'}} 赛况</view>
        <view class="event-list">
          <view class="event-item" v-for="e in teamBEvents" :key="e.id">
            <view class="event-time">{{e.minute}}'</view>
            <view class="event-detail">
              <text v-if="e.type === 'goal'">⚽ {{players[e.playerId]?.nickname}} 进球<text v-if="e.assistById"> ({{getPlayerName(e.assistById)}} 助攻)</text></text>
              <text v-else-if="e.type === 'assist'">🎯 助攻: {{players[e.playerId]?.nickname}}</text>
              <text v-else-if="e.type === 'yellow'">🟨 {{players[e.playerId]?.nickname}} 黄牌</text>
              <text v-else-if="e.type === 'red'">🟥 {{players[e.playerId]?.nickname}} 红牌</text>
              <text v-else-if="e.type === 'ownGoal' || e.type === 'own_goal'">⚽ {{players[e.playerId]?.nickname}} 乌龙(OG)</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 评分 -->
      <view class="card" v-if="match.status === 'completed' && match.ratingOpen">
        <view class="section-title">⭐ 评分</view>
        <view class="rating-list">
          <view class="rating-item" v-for="(pid, idx) in confirmedPlayerIds" :key="pid">
            <view class="rating-left">
              <text class="rating-name">{{players[pid]?.nickname}}</text>
              <view class="rating-badges" v-if="getPlayerGoals(pid) > 0 || getPlayerAssists(pid) > 0 || getPlayerYellows(pid) > 0 || getPlayerReds(pid) > 0 || getPlayerOwnGoals(pid) > 0">
                <text v-if="getPlayerGoals(pid) > 0" class="badge-goal">⚽{{getPlayerGoals(pid)}}</text>
                <text v-if="getPlayerAssists(pid) > 0" class="badge-assist">🅰️{{getPlayerAssists(pid)}}</text>
                <text v-if="getPlayerYellows(pid) > 0" class="badge-yellow">🟨{{getPlayerYellows(pid)}}</text>
                <text v-if="getPlayerReds(pid) > 0" class="badge-red">🟥{{getPlayerReds(pid)}}</text>
                <text v-if="getPlayerOwnGoals(pid) > 0" class="badge-own">OG{{getPlayerOwnGoals(pid)}}</text>
              </view>
            </view>
            <view class="rating-right">
              <text v-if="isMVP(pid)" class="mvp-badge">🏆MVP</text>
              <text class="rating-score">{{(matchRatings[pid] || 5).toFixed(1)}}</text>
            </view>
          </view>
        </view>
        <view class="btn-primary" style="margin-top:20rpx" @click="goRate">📝 去评分</view>
      </view>
      
      <!-- MVP -->
      <view class="card" v-if="match.mvp && match.mvp.length > 0">
        <view class="section-title">🏆 MVP</view>
        <view class="mvp-players">
          <view class="mvp-item" v-for="pid in match.mvp" :key="pid">
            <view class="mvp-avatar">{{players[pid]?.nickname?.[0] || '?'}}</view>
            <text class="mvp-name">{{players[pid]?.nickname || '未知'}}</text>
          </view>
        </view>
        <view v-if="isAdmin && match.status === 'completed'" class="admin-mvp-btn" @click="showMVPSelector">
          <text>🏆 指定MVP</text>
        </view>
      </view>
      
    </view>
    <!-- 自定义球员选择器弹窗 -->
    <view class="picker-overlay" v-if="showPlayerPicker" @click="showPlayerPicker = false">
      <view class="picker-popup" @click.stop>
        <view class="picker-header">
          <text class="picker-title">{{pickerTitle}}</text>
          <text class="picker-close" @click="showPlayerPicker = false">✕</text>
        </view>
        <scroll-view scroll-y class="picker-body">
          <view class="picker-item" v-for="r in pickerPlayers" :key="r.playerId" @click="onPickerSelect(r.playerId)">
            <text class="picker-name">{{r.player?.nickname || '未知'}}</text>
            <text v-if="r.player?.kttLast4" class="picker-ktt">({{r.player.kttLast4}})</text>
          </view>
        </scroll-view>
      </view>
    </view>
    
    <!-- 图片预览弹窗 -->
    <view class="image-preview-overlay" v-if="showImagePreview" @click="showImagePreview = false">
      <image class="image-preview-img" :src="previewImageUrl" mode="widthFix" @click.stop />
      <view class="image-preview-close" @click="showImagePreview = false">✕ 关闭</view>
    </view>

    <!-- 互评记录弹窗 -->
    <view class="picker-overlay" v-if="showPeerRatings" @click="showPeerRatings = false">
      <view class="picker-popup" @click.stop>
        <view class="picker-header">
          <text class="picker-title">互评记录</text>
          <text class="picker-close" @click="showPeerRatings = false">✕</text>
        </view>
        <scroll-view scroll-y class="picker-body">
          <view v-if="allPeerRatings.length === 0" class="empty-state">暂无互评记录</view>
          <view v-else>
            <view class="peer-summary">共 {{allPeerRatings.length}} 条互评</view>
            <view v-for="group in groupedPeerRatings" :key="group.toId">
              <view class="peer-group-header">👤 {{group.toName}}</view>
              <view class="peer-group-body">
                <view class="peer-rating-item" v-for="r in group.items" :key="r.fromId">
                  <text class="peer-from">{{r.fromName}}</text>
                  <text class="peer-arrow">→</text>
                  <text class="peer-score">{{r.score}}分</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
const db = wx.cloud.database();

export default {
  data() {
    return {
      loading: true,
      matchId: '',
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [], events: [], teamConfirmed: false, registrationClosed: false, ratingOpen: false, ownerId: '', assistantIds: [] },
      players: {},
      openid: '',
      isAdmin: false,
      isSuperAdmin: false,
      currentPlayerId: '',
      allPlayers: [],
      showPlayerPicker: false,
      pickerTitle: '',
      pickerPlayers: [],
      pickerCallback: null,
      // 图片预览
      showImagePreview: false,
      previewImageUrl: '',
      lineupTab: 'A',
      collapsedSections: { owner: false, registration: false },
      showPeerRatings: false,
      allPeerRatings: [],
      // 手动排序模式
      isSortingMode: false,
      sortableRegistrations: [],
    };
  },
  computed: {
    statusText() {
      const map = { upcoming: '即将开始', ongoing: '进行中', completed: '已结束' };
      return map[this.match.status] || this.match.status;
    },
    statusClass() {
      const map = { upcoming: 'status-upcoming', ongoing: 'status-ongoing', completed: 'status-completed' };
      return map[this.match.status] || '';
    },
    statusLabel() {
      if (this.match.status === 'upcoming') {
        if (this.match.teamConfirmed) return '已分队';
        if (this.match.registrationClosed) return '已关闭';
        return '报名中';
      }
      if (this.match.status === 'ongoing') return '比赛中';
      if (this.match.status === 'completed') return this.match.ratingOpen ? '评分中' : '已完赛';
      return '';
    },
    isNew() {
      if (!this.match.createdAt) return false;
      let createdAt = this.match.createdAt;
      if (typeof createdAt === 'object') {
        if (createdAt.iso) createdAt = createdAt.iso;
        else if (createdAt._date && createdAt._date.numberLong) createdAt = createdAt._date.numberLong;
        else if (createdAt._date) createdAt = createdAt._date;
        else return false;
      }
      if (typeof createdAt === 'string' && /^\d+$/.test(createdAt)) {
        createdAt = parseInt(createdAt);
      }
      const created = new Date(createdAt);
      if (isNaN(created.getTime())) return false;
      const now = new Date();
      return (now - created) < 24 * 60 * 60 * 1000;
    },
    rawRegistrations() {
      return (this.match.registrations || []).map(r => {
        // 兼容旧数据：没有status字段的，根据needScreenshot判断
        let status = r.status;
        if (!status) {
          status = this.match.needScreenshot === false ? 'confirmed' : 'pending_screenshot';
        }
        return {
          ...r,
          status,
          player: this.players[r.playerId] || {}
        };
      });
    },
    sortedRegistrations() {
      const maxPlayers = this.match.maxPlayers || 14;
      const ownerId = this.match.ownerId;
      const assistantIds = this.match.assistantIds || [];
      const isProtected = (r) => r.playerId === ownerId || assistantIds.includes(r.playerId);
      const sorted = [...this.rawRegistrations].sort((a, b) => {
        // 1. 场主/护法优先级最高
        const protectedA = isProtected(a) ? 1 : 0;
        const protectedB = isProtected(b) ? 1 : 0;
        if (protectedA !== protectedB) return protectedB - protectedA;

        // 2. 取消的排最后
        if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
        if (b.status === 'cancelled' && a.status !== 'cancelled') return -1;

        // 3. 有截图的（confirmed / screenshot_uploaded）> 没有截图的（pending_screenshot）
        const hasScreenshotA = a.status === 'confirmed' || a.status === 'screenshot_uploaded';
        const hasScreenshotB = b.status === 'confirmed' || b.status === 'screenshot_uploaded';
        if (hasScreenshotA !== hasScreenshotB) return hasScreenshotB ? 1 : -1;

        // 4. 同组内严格按照报名时间排序（包括临时球员/代报名）
        const regTimeA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
        const regTimeB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
        return regTimeA - regTimeB;
      });
      return sorted.map((r, idx) => ({
        ...r,
        displayIndex: idx + 1,
        isWL: idx >= maxPlayers
      }));
    },
    isRegistered() {
      return this.match.registrations?.some(r => r.playerId === this.currentPlayerId && r.status !== 'cancelled');
    },
    ownerName() {
      return this.players[this.match.ownerId]?.nickname || '待定';
    },
    confirmedPlayerIds() {
      // 评分权限以分队名单为准，排除临时球员
      const teamAPlayers = (this.match.teamA?.players || []).filter(pid => typeof pid === 'string' && !pid.startsWith('temp_'));
      const teamBPlayers = (this.match.teamB?.players || []).filter(pid => typeof pid === 'string' && !pid.startsWith('temp_'));
      return [...new Set([...teamAPlayers, ...teamBPlayers])];
    },
    matchRatings() {
      const ratings = {};
      for (const pid of this.confirmedPlayerIds) {
        ratings[pid] = this.getPlayerMatchRating(pid) || 5;
      }
      return ratings;
    },
    teamAGoalEvents() {
      return (this.match.events || [])
        .filter(e => e.type === 'goal' && this.isInTeamA(e.playerId))
        .sort((a, b) => (a.minute || 0) - (b.minute || 0));
    },
    teamBGoalEvents() {
      return (this.match.events || [])
        .filter(e => e.type === 'goal' && this.isInTeamB(e.playerId))
        .sort((a, b) => (a.minute || 0) - (b.minute || 0));
    },
    teamAEvents() {
      const events = this.match.events || [];
      return events
        .filter(e => this.isInTeamA(e.playerId))
        .sort((a, b) => (a.minute || 0) - (b.minute || 0));
    },
    teamBEvents() {
      const events = this.match.events || [];
      return events
        .filter(e => this.isInTeamB(e.playerId))
        .sort((a, b) => (a.minute || 0) - (b.minute || 0));
    },
    goalEvents() {
      return (this.match.events || [])
        .filter(e => e.type === 'goal')
        .sort((a, b) => (a.minute || 0) - (b.minute || 0));
    },
    teamAPlayersFiltered() {
      return (this.match.teamA?.players || []).filter(pid => !this.players[pid]?._isTempPlayer);
    },
    teamBPlayersFiltered() {
      return (this.match.teamB?.players || []).filter(pid => !this.players[pid]?._isTempPlayer);
    },
    // 按被评人分组的互评记录
    groupedPeerRatings() {
      const groups = {};
      for (const r of this.allPeerRatings) {
        if (!groups[r.toId]) {
          groups[r.toId] = { toId: r.toId, toName: r.toName, items: [] };
        }
        groups[r.toId].items.push(r);
      }
      return Object.values(groups);
    },
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadMatch();
  },
  onShareAppMessage() {
    const title = this.match.title || '比赛';
    const score = this.match.status === 'completed' 
      ? ` (${this.match.teamA.score}-${this.match.teamB.score})`
      : '';
    return {
      title: `${title}${score}`,
      path: `/pages/match/detail?id=${this.matchId}`,
    };
  },
  methods: {
    async loadMatch() {
      this.loading = true;
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' });
        this.openid = loginRes.result.openid;
        this.isAdmin = loginRes.result.isAdmin || false;
        this.isSuperAdmin = loginRes.result.isSuperAdmin || false;
        this.currentPlayerId = loginRes.result.playerId || '';

        const { data } = await db.collection('matches').doc(this.matchId).get();
        this.match = {
          teamA: { players: [], score: 0 },
          teamB: { players: [], score: 0 },
          registrations: [],
          events: [],
          teamConfirmed: false,
          registrationClosed: false,
          ratingOpen: false,
          ownerId: '',
          assistantIds: [],
          ...data
        };

        const playerIds = [...new Set([
          ...(data.registrations || []).map(r => r.playerId),
          data.ownerId,
          ...(data.assistantIds || []),
          ...(data.teamA?.players || []),
          ...(data.teamB?.players || []),
          ...(data.events || []).map(e => e.playerId),
          ...(data.lateQuitters || []).map(q => q.playerId)
        ].filter(Boolean))];
        
        if (playerIds.length > 0) {
          try {
            const { result } = await wx.cloud.callFunction({ name: 'getPlayers' });
            const allPlayers = result.players || [];
            allPlayers.forEach(p => { 
              if (playerIds.includes(p._id)) {
                this.players[p._id] = p; 
              }
            });
            this.allPlayers = allPlayers;
          } catch (e) {
            console.error('加载球员信息失败', e);
          }
        }
        
        // 注入临时球员信息（分队页面可能已将临时球员分配到队伍中）
        (data.registrations || []).forEach(r => {
          if (r.isTempPlayer || (r.playerId && r.playerId.startsWith('temp_'))) {
            this.players[r.playerId] = {
              _id: r.playerId,
              nickname: r.tempNickname || '临时球员',
              _isTempPlayer: true,
              positions: r.tempPositions || [],
              height: '', weight: '', birthDate: '',
              stats: { rating: 5 }
            };
          }
        });
      } catch (e) {
        console.error('加载失败', e);
      }
      this.loading = false;
    },
    
    showRegister() {
      if (!this.currentPlayerId) {
        uni.showModal({
          title: '⚠️ 尚未注册',
          content: '您还没有注册球员信息，注册后才能报名参赛。',
          confirmText: '去注册',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              uni.switchTab({ url: '/pages/players/my' });
            }
          }
        });
        return;
      }
      this.doRegister(this.currentPlayerId);
    },

    async doRegister(playerId) {
      wx.showLoading({ title: '报名中' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'registerMatch',
          data: { action: 'register', matchId: this.matchId, playerId }
        });
        if (result.success) {
          uni.showToast({ title: '报名成功' });
          this.loadMatch();
          if (result.status === 'pending_screenshot') {
            const deadline = this.match.screenshotDeadline ? this.match.screenshotDeadline.replace('T', ' ') : '';
            setTimeout(() => {
              uni.showModal({
                title: '⚠️ 请上传截图',
                content: deadline ? `本场比赛需要抽场截图，请于 ${deadline} 前上传截图完成报名。` : '本场比赛需要抽场截图，请尽快上传截图完成报名。',
                confirmText: '现在上传',
                cancelText: '稍后',
                success: (res) => { if (res.confirm) this.uploadScreenshot(); }
              });
            }, 500);
          }
        } else {
          uni.showToast({ title: result.error || '报名失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: '报名失败', icon: 'none' });
      }
      wx.hideLoading();
    },

    async cancelRegister(playerId) {
      // 计算是否满足罚款条件：距离开赛不足24小时，且取消后已报名人数 < 人数上限
      const matchDateTime = new Date(`${this.match.date}T${this.match.time}`);
      const cancelDeadline = new Date(matchDateTime.getTime() - 24 * 60 * 60 * 1000);
      const now = new Date();
      const isWithin24h = now > cancelDeadline;
      const confirmedCount = this.sortedRegistrations.filter(r => !r.isWL && r.status !== 'cancelled').length;
      const willBeBelowLimit = confirmedCount - 1 < (this.match.maxPlayers || 14);
      
      const showWarning = isWithin24h && willBeBelowLimit;
      
      uni.showModal({
        title: showWarning ? '⚠️ 取消报名确认' : '确认退出',
        content: showWarning 
          ? '距离开赛已不足24小时，且无候补球员，可能会被罚款。确定退出报名？'
          : '确定退出这场比赛的报名？',
        confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' });
            try {
              const { result } = await wx.cloud.callFunction({
                name: 'registerMatch',
                data: { action: 'unregister', matchId: this.matchId, playerId }
              });
              if (result.success) { uni.showToast({ title: '已退出' }); this.loadMatch(); }
              else { uni.showToast({ title: result.error || '退出失败', icon: 'none' }); }
            } catch (e) { uni.showToast({ title: '退出失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async toggleRegistration() {
      const newVal = !this.match.registrationClosed;
      try {
        await db.collection('matches').doc(this.matchId).update({ data: { registrationClosed: newVal } });
        this.match.registrationClosed = newVal;
        uni.showToast({ title: newVal ? '已关闭报名' : '已开启报名' });
      } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
    },

    // 手动排序模式
    enterSortMode() {
      // 复制当前排序后的报名列表到可编辑数组
      this.sortableRegistrations = this.sortedRegistrations.map((r, idx) => ({
        ...r,
        sortIndex: idx,
        isWL: idx >= (this.match.maxPlayers || 14)
      }));
      this.isSortingMode = true;
    },
    cancelSortMode() {
      this.isSortingMode = false;
      this.sortableRegistrations = [];
    },
    moveUp(index) {
      if (index <= 0) return;
      const arr = this.sortableRegistrations;
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      // 重新计算 displayIndex 和 isWL
      const maxPlayers = this.match.maxPlayers || 14;
      this.sortableRegistrations = arr.map((r, idx) => ({
        ...r,
        displayIndex: idx + 1,
        isWL: idx >= maxPlayers
      }));
    },
    moveDown(index) {
      if (index >= this.sortableRegistrations.length - 1) return;
      const arr = this.sortableRegistrations;
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      // 重新计算 displayIndex 和 isWL
      const maxPlayers = this.match.maxPlayers || 14;
      this.sortableRegistrations = arr.map((r, idx) => ({
        ...r,
        displayIndex: idx + 1,
        isWL: idx >= maxPlayers
      }));
    },
    async saveSortOrder() {
      wx.showLoading({ title: '保存中' });
      try {
        // 构建新的 registrations 数组，按 sortableRegistrations 的顺序
        const newOrder = this.sortableRegistrations.map(r => {
          const original = (this.match.registrations || []).find(orig => orig.playerId === r.playerId);
          return original || r;
        });
        await db.collection('matches').doc(this.matchId).update({
          data: { registrations: newOrder }
        });
        this.match.registrations = newOrder;
        this.isSortingMode = false;
        this.sortableRegistrations = [];
        uni.showToast({ title: '排序已保存' });
        this.loadMatch();
      } catch (e) {
        console.error('保存排序失败', e);
        uni.showToast({ title: '保存失败', icon: 'none' });
      }
      wx.hideLoading();
    },

    goEdit() {
      uni.navigateTo({ url: `/pages/match/edit?id=${this.matchId}` });
    },
    goTeamSplit() {
      uni.navigateTo({ url: `/pages/match/teamSplit?id=${this.matchId}` });
    },
    goRecord() {
      uni.navigateTo({ url: `/pages/match/record?id=${this.matchId}` });
    },
    goRate() {
      uni.navigateTo({ url: `/pages/match/rate?id=${this.matchId}` });
    },
    goPlayerDetail(playerId) {
      if (!playerId) return;
      uni.navigateTo({ url: `/pages/players/detail?id=${playerId}` });
    },

    async startMatch() {
      uni.showModal({
        title: '开始比赛', content: '确定开始比赛？',
        confirmColor: '#16a34a',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' });
            try {
              await db.collection('matches').doc(this.matchId).update({ data: { status: 'ongoing' } });
              uni.showToast({ title: '比赛已开始' }); this.loadMatch();
            } catch (e) { uni.showToast({ title: '开始失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async endMatch() {
      uni.showModal({
        title: '结束比赛', content: '确定结束比赛？',
        confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' });
            try {
              await db.collection('matches').doc(this.matchId).update({ data: { status: 'completed' } });
              uni.showToast({ title: '比赛已结束' }); this.loadMatch();
            } catch (e) { uni.showToast({ title: '结束失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async toggleRating() {
      const newVal = !this.match.ratingOpen;
      try {
        wx.showLoading({ title: '处理中' });
        await db.collection('matches').doc(this.matchId).update({ data: { ratingOpen: newVal } });
        this.match.ratingOpen = newVal;
        uni.showToast({ title: newVal ? '评分已开启' : '评分已关闭' });
        if (newVal) {
          try { await wx.cloud.callFunction({ name: 'sendNotification', data: { type: 'rating_open', matchId: this.matchId } }); }
          catch (e) { console.error('评分通知发送失败', e); }
        }
      } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
      wx.hideLoading();
      if (!newVal) {
        wx.showLoading({ title: '计算MVP中' });
        try { await wx.cloud.callFunction({ name: 'recalculateStats' }); uni.showToast({ title: 'MVP已计算' }); this.loadMatch(); }
        catch (e) { console.error('MVP计算失败', e); uni.showToast({ title: 'MVP计算失败', icon: 'none' }); }
        wx.hideLoading();
      }
    },

    async uploadScreenshot() {
      let tempFilePath = '';
      let fileSize = 0;
      
      try {
        // 优先使用 wx.chooseMedia，失败时回退到 wx.chooseImage
        try {
          const res = await new Promise((resolve, reject) => {
            wx.chooseMedia({
              count: 1,
              mediaType: ['image'],
              sourceType: ['album', 'camera'],
              success: resolve,
              fail: reject
            });
          });
          if (!res.tempFiles || res.tempFiles.length === 0) {
            uni.showToast({ title: '未选择图片', icon: 'none' });
            return;
          }
          tempFilePath = res.tempFiles[0].tempFilePath;
          fileSize = res.tempFiles[0].size || 0;
        } catch (chooseErr) {
          console.log('wx.chooseMedia 失败，回退到 wx.chooseImage:', chooseErr);
          const errMsg = chooseErr.errMsg || '';
          // 如果是 API 不支持或调用失败，回退到 chooseImage
          if (errMsg.includes('not support') || errMsg.includes('fail') || !wx.chooseMedia) {
            const res = await new Promise((resolve, reject) => {
              wx.chooseImage({
                count: 1,
                sizeType: ['original', 'compressed'],
                sourceType: ['album', 'camera'],
                success: resolve,
                fail: reject
              });
            });
            if (!res.tempFilePaths || res.tempFilePaths.length === 0) {
              uni.showToast({ title: '未选择图片', icon: 'none' });
              return;
            }
            tempFilePath = res.tempFilePaths[0];
            fileSize = res.tempFiles?.[0]?.size || 0;
          } else {
            throw chooseErr;
          }
        }
        
        // 如果图片大于 2MB，尝试压缩
        if (fileSize > 2 * 1024 * 1024) {
          uni.showLoading({ title: '压缩图片中...' });
          try {
            const compressRes = await new Promise((resolve, reject) => {
              wx.compressImage({
                src: tempFilePath,
                quality: 70,
                success: resolve,
                fail: reject
              });
            });
            tempFilePath = compressRes.tempFilePath;
          } catch (compressErr) {
            console.log('图片压缩失败，使用原图', compressErr);
          }
        }
        
        uni.showLoading({ title: '上传中' });
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: `screenshots/${this.matchId}/${this.currentPlayerId}_${Date.now()}.jpg`,
            filePath: tempFilePath
          });
          
          const { result } = await wx.cloud.callFunction({
            name: 'registerMatch',
            data: { action: 'uploadScreenshot', matchId: this.matchId, playerId: this.currentPlayerId, screenshot: uploadRes.fileID }
          });
          
          if (result.success) { 
            uni.showToast({ title: '截图上传成功' }); 
            this.loadMatch(); 
          }
          else { 
            uni.showToast({ title: result.error || '上传失败', icon: 'none', duration: 3000 }); 
          }
        } catch (e) { 
          console.error('上传截图失败', e);
          const errMsg = e.message || e.errMsg || '未知错误';
          if (errMsg.includes('exceed max size') || errMsg.includes('文件过大')) {
            uni.showToast({ title: '图片过大，请压缩后再试', icon: 'none', duration: 3000 });
          } else if (errMsg.includes('fail')) {
            uni.showToast({ title: '上传失败: ' + errMsg, icon: 'none', duration: 3000 });
          } else {
            uni.showToast({ title: '上传失败，请重试', icon: 'none', duration: 3000 }); 
          }
        }
        uni.hideLoading();
      } catch (e) {
        // 用户取消选择或选择图片失败，不做处理
        console.log('选择图片取消或失败', e);
      }
    },
    async confirmTeam() {
      uni.showModal({
        title: '确认名单', content: '确认后将按优先级排序，超出上限的变为候补。确定？',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' });
            try {
              const { result } = await wx.cloud.callFunction({
                name: 'registerMatch', data: { action: 'confirmTeam', matchId: this.matchId }
              });
              if (result.success) { uni.showToast({ title: '已确认名单' }); this.loadMatch(); }
              else { uni.showToast({ title: result.error || '确认失败', icon: 'none' }); }
            } catch (e) { uni.showToast({ title: '确认失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async deleteMatch() {
      uni.showModal({
        title: '删除场次', content: '确定删除该场次？删除后不可恢复。',
        confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '删除中' });
            try { await db.collection('matches').doc(this.matchId).remove(); uni.showToast({ title: '已删除' }); uni.navigateBack(); }
            catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },

    async changeOwner() {
      const available = this.rawRegistrations.filter(r => r.playerId && r.playerId !== this.match.ownerId);
      if (available.length === 0) { uni.showToast({ title: '暂无报名人员', icon: 'none' }); return; }
      this.pickerTitle = '选择场主';
      this.pickerPlayers = available;
      this.pickerCallback = async (playerId) => {
        try {
          await wx.cloud.callFunction({
            name: 'updateMatch', data: { matchId: this.matchId, updateData: { ownerId: playerId } }
          });
          uni.showToast({ title: '场主设定成功' }); this.loadMatch();
        } catch (e) { uni.showToast({ title: '设定失败', icon: 'none' }); }
      };
      this.showPlayerPicker = true;
    },

    async addAssistant() {
      const currentIds = this.match?.assistantIds || [];
      if (currentIds.length >= 4) { uni.showToast({ title: '护法最多4人', icon: 'none' }); return; }
      const available = this.rawRegistrations.filter(r => r.playerId && r.playerId !== this.match.ownerId && !currentIds.includes(r.playerId));
      if (available.length === 0) { uni.showToast({ title: '没有可添加的护法人选', icon: 'none' }); return; }
      this.pickerTitle = '添加护法';
      this.pickerPlayers = available;
      this.pickerCallback = async (playerId) => {
        try {
          const newIds = [...currentIds, playerId];
          await wx.cloud.callFunction({
            name: 'updateMatch', data: { matchId: this.matchId, updateData: { assistantIds: newIds, assistantId: newIds[0] } }
          });
          uni.showToast({ title: '护法添加成功' }); this.loadMatch();
        } catch (e) { uni.showToast({ title: '添加失败', icon: 'none' }); }
      };
      this.showPlayerPicker = true;
    },

    async removeAssistant(playerId) {
      uni.showModal({
        title: '确认移除', content: '确定移除该护法？', confirmColor: '#dc2626',
        success: async (res) => {
          if (res.confirm) {
            try {
              const newIds = (this.match?.assistantIds || []).filter(id => id !== playerId);
              await wx.cloud.callFunction({
                name: 'updateMatch', data: { matchId: this.matchId, updateData: { assistantIds: newIds, assistantId: newIds[0] || '' } }
              });
              uni.showToast({ title: '已移除' }); this.loadMatch();
            } catch (e) { uni.showToast({ title: '移除失败', icon: 'none' }); }
          }
        }
      });
    },
    async confirmScreenshot(playerId) {
      wx.showLoading({ title: "确认中" });
      try {
        const { result } = await wx.cloud.callFunction({
          name: "registerMatch", data: { action: "confirmScreenshot", matchId: this.matchId, playerId }
        });
        if (result.success) { uni.showToast({ title: "已确认" }); this.loadMatch(); }
        else { uni.showToast({ title: result.error || "确认失败", icon: "none" }); }
      } catch (e) { uni.showToast({ title: "确认失败", icon: "none" }); }
      wx.hideLoading();
    },

    async cancelConfirm(playerId) {
      uni.showModal({
        title: "取消确认", content: "确定取消该球员的截图确认？",
        confirmColor: "#dc2626",
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: "处理中" });
            try {
              const { result } = await wx.cloud.callFunction({
                name: "registerMatch", data: { action: "cancelConfirm", matchId: this.matchId, playerId }
              });
              if (result.success) { uni.showToast({ title: "已取消确认" }); this.loadMatch(); }
              else { uni.showToast({ title: result.error || "取消失败", icon: "none" }); }
            } catch (e) { uni.showToast({ title: "取消失败", icon: "none" }); }
            wx.hideLoading();
          }
        }
      });
    },

    async deleteRegistration(playerId) {
      uni.showModal({
        title: "确认删除", content: "确定删除该球员的报名记录？",
        confirmColor: "#dc2626",
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: "删除中" });
            try {
              const { result } = await wx.cloud.callFunction({
                name: "registerMatch", data: { action: "adminRemove", matchId: this.matchId, playerId }
              });
              if (result.success) { uni.showToast({ title: "已删除" }); this.loadMatch(); }
              else { uni.showToast({ title: result.error || "删除失败", icon: "none" }); }
            } catch (e) { uni.showToast({ title: "删除失败", icon: "none" }); }
            wx.hideLoading();
          }
        }
      });
    },

    onPickerSelect(playerId) {
      this.showPlayerPicker = false;
      if (this.pickerCallback) {
        this.pickerCallback(playerId);
        this.pickerCallback = null;
      }
    },

    async previewScreenshot(fileID) {
      if (!fileID) { uni.showToast({ title: '无截图', icon: 'none' }); return; }
      
      wx.showLoading({ title: '加载截图中' });
      
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'getScreenshotURL',
          data: { fileID }
        });
        
        wx.hideLoading();
        
        if (result.success) {
          this.previewImageUrl = result.url;
          this.showImagePreview = true;
        } else {
          uni.showToast({ title: result.error || '截图获取失败', icon: 'none' });
        }
      } catch (e) {
        wx.hideLoading();
        console.error('获取截图失败', e);
        uni.showToast({ title: '截图获取失败', icon: 'none' });
      }
    },

    async testNotify(type) {
      try {
        await wx.cloud.callFunction({
          name: 'sendNotification', data: { type, matchId: this.matchId, test: true }
        });
        uni.showToast({ title: '已发送测试' });
      } catch (e) { uni.showToast({ title: '发送失败', icon: 'none' }); }
    },

    isInTeamA(playerId) { return (this.match.teamA?.players || []).includes(playerId); },
    isInTeamB(playerId) { return (this.match.teamB?.players || []).includes(playerId); },
    getEventTeamColor(playerId) {
      if (this.isInTeamA(playerId)) return this.getTeamDotColor(this.match.teamA);
      if (this.isInTeamB(playerId)) return this.getTeamDotColor(this.match.teamB);
      return '#9ca3af';
    },
    getTeamDotColor(team) {
      const colorName = String(team?.color || team?.name || '').trim().toLowerCase();
      if (colorName.includes('白') || colorName.includes('white')) return '#e5e7eb';
      if (colorName.includes('黑') || colorName.includes('black')) return '#1f2937';
      if (colorName.includes('灰') || colorName.includes('grey') || colorName.includes('gray')) return '#6b7280';
      if (colorName.includes('红') || colorName.includes('red')) return '#dc2626';
      if (colorName.includes('橙') || colorName.includes('orange')) return '#f97316';
      if (colorName.includes('黄') || colorName.includes('yellow')) return '#facc15';
      if (colorName.includes('绿') || colorName.includes('green')) return '#16a34a';
      if (colorName.includes('青') || colorName.includes('cyan') || colorName.includes('teal')) return '#06b6d4';
      if (colorName.includes('蓝') || colorName.includes('blue')) return '#3b82f6';
      if (colorName.includes('紫') || colorName.includes('purple') || colorName.includes('violet')) return '#9333ea';
      if (colorName.includes('粉') || colorName.includes('pink') || colorName.includes('玫')) return '#ec4899';
      if (/^#[0-9a-f]{3,8}$/i.test(colorName)) return colorName;
      return '#9ca3af';
    },
    getTeamAGoals(m) {
      const aPlayers = new Set(m.teamA?.players || []);
      const allEvents = m.events || [];
      const assistEvents = allEvents.filter(e => e.type === 'assist');
      return allEvents
        .filter(e => (e.type === 'goal' && aPlayers.has(e.playerId)) || (e.type === 'own_goal' && !aPlayers.has(e.playerId)))
        .map(g => {
          const assist = assistEvents.find(a => a.assistById === g.playerId && a.minute === g.minute);
          return { ...g, assistById: assist ? assist.playerId : g.assistById, isOwnGoal: g.type === 'own_goal' };
        });
    },
    getTeamBGoals(m) {
      const bPlayers = new Set(m.teamB?.players || []);
      const allEvents = m.events || [];
      const assistEvents = allEvents.filter(e => e.type === 'assist');
      return allEvents
        .filter(e => (e.type === 'goal' && bPlayers.has(e.playerId)) || (e.type === 'own_goal' && !bPlayers.has(e.playerId)))
        .map(g => {
          const assist = assistEvents.find(a => a.assistById === g.playerId && a.minute === g.minute);
          return { ...g, assistById: assist ? assist.playerId : g.assistById, isOwnGoal: g.type === 'own_goal' };
        });
    },
    formatTime(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getMonth()+1}月${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
    },
    
    
    async adminRegister() {
      const registeredIds = new Set((this.match.registrations || []).filter(r => r.status !== 'cancelled').map(r => r.playerId));
      const available = this.allPlayers.filter(p => !registeredIds.has(p._id));
      if (available.length === 0) { uni.showToast({ title: '没有可代报名的球员', icon: 'none' }); return; }
      this.pickerTitle = '代报名';
      this.pickerPlayers = available.map(p => ({ playerId: p._id, player: p }));
      this.pickerCallback = async (playerId) => {
        wx.showLoading({ title: '报名中' });
        try {
          const { result } = await wx.cloud.callFunction({
            name: 'registerMatch', data: { action: 'adminAdd', matchId: this.matchId, playerId }
          });
          if (result.success) { uni.showToast({ title: '代报名成功' }); this.loadMatch(); }
          else { uni.showToast({ title: result.error || '代报名失败', icon: 'none' }); }
        } catch (e) { uni.showToast({ title: '代报名失败', icon: 'none' }); }
        wx.hideLoading();
      };
      this.showPlayerPicker = true;
    },
    
    async addTempPlayer() {
      uni.showModal({
        title: '添加临时球员',
        editable: true,
        placeholderText: '请输入临时球员昵称',
        success: async (res) => {
          if (res.confirm && res.content && res.content.trim()) {
            wx.showLoading({ title: '添加中' });
            try {
              const { result } = await wx.cloud.callFunction({
                name: 'registerMatch', data: { action: 'addTempPlayer', matchId: this.matchId, tempPlayer: { nickname: res.content.trim() } }
              });
              if (result.success) { uni.showToast({ title: '已添加临时球员' }); this.loadMatch(); }
              else { uni.showToast({ title: result.error || '添加失败', icon: 'none' }); }
            } catch (e) { uni.showToast({ title: '添加失败', icon: 'none' }); }
            wx.hideLoading();
          }
        }
      });
    },
    
    async showMVPSelector() {
      const confirmed = (this.match.registrations || []).filter(r => r.status === 'confirmed' || r.status === 'screenshot_uploaded').map(r => r.playerId);
      if (confirmed.length === 0) { uni.showToast({ title: '暂无已确认球员', icon: 'none' }); return; }
      const items = confirmed.map(pid => this.players[pid]?.nickname || '未知');
      const ids = confirmed;
      uni.showActionSheet({
        itemList: items,
        success: async (res) => {
          try { await db.collection('matches').doc(this.matchId).update({ data: { mvp: [ids[res.tapIndex]] } }); uni.showToast({ title: 'MVP 已指定' }); this.loadMatch(); }
          catch (e) { uni.showToast({ title: '指定失败', icon: 'none' }); }
        }
      });
    },

    getPlayerGoals(pid) {
      return (this.match.events || []).filter(e => e.type === 'goal' && e.playerId === pid).length;
    },
    getPlayerAssists(pid) {
      // 兼容新旧两种助攻数据格式
      // 新格式：goal 事件直接包含 assistById
      // 旧格式：独立的 assist 事件，playerId 为助攻者
      return (this.match.events || []).filter(e =>
        (e.type === 'goal' && e.assistById === pid) ||
        (e.type === 'assist' && e.playerId === pid)
      ).length;
    },
    getPlayerMatchRating(pid) {
      const p = this.players[pid];
      if (!p || !p.ratings) return null;
      const peer = (p.ratings.peerRatings || []).filter(r => r.matchId === this.matchId);
      const admin = (p.ratings.adminRatings || []).filter(r => r.matchId === this.matchId);
      const all = [...peer, ...admin];
      if (all.length === 0) return null;
      return all.reduce((s, r) => s + r.score, 0) / all.length;
    },
    getPlayerYellows(pid) {
      return (this.match.events || []).filter(e => e.type === 'yellow' && e.playerId === pid).length;
    },
    getPlayerReds(pid) {
      return (this.match.events || []).filter(e => e.type === 'red' && e.playerId === pid).length;
    },
    getPlayerOwnGoals(pid) {
      return (this.match.events || []).filter(e => (e.type === 'ownGoal' || e.type === 'own_goal') && e.playerId === pid).length;
    },
    isMVP(pid) {
      return (this.match.mvp || []).includes(pid);
    },
    getPlayerName(pid) {
      return this.players[pid]?.nickname || '未知';
    },
    toggleCollapse(key) {
      this.collapsedSections[key] = !this.collapsedSections[key];
    },
    async showPeerRatingsModal() {
      wx.showLoading({ title: '加载中' });
      // 从所有参赛球员的 ratings 中收集本场比赛的互评
      const peerMap = new Map();
      for (const p of Object.values(this.players)) {
        const peerList = p.ratings?.peerRatings || [];
        for (const r of peerList) {
          if (r.matchId === this.matchId && r.fromId && r.score > 0) {
            const key = r.fromId + '_' + p._id;
            // 去重：保留最新的（有 createdAt 时按时间）
            const existing = peerMap.get(key);
            if (!existing || (r.createdAt && existing.createdAt && r.createdAt > existing.createdAt)) {
              peerMap.set(key, {
                fromId: r.fromId,
                fromName: this.players[r.fromId]?.nickname || '未知',
                toId: p._id,
                toName: p.nickname || '未知',
                score: r.score,
                createdAt: r.createdAt
              });
            }
          }
        }
      }
      // 按被评人(toId)分组，再按评分人(fromId)排序
      const allPeer = Array.from(peerMap.values()).sort((a, b) => {
        if (a.toId !== b.toId) return a.toId.localeCompare(b.toId);
        return a.fromId.localeCompare(b.fromId);
      });
      this.allPeerRatings = allPeer;
      this.showPeerRatings = true;
      wx.hideLoading();
    }
  }
};
</script>

<style scoped>
.container { padding: 20rpx; background: #f8fafc; min-height: 100vh; }
.loading { text-align: center; padding: 120rpx 0; }
.loading-spinner { font-size: 80rpx; margin-bottom: 20rpx; }
.loading-text { font-size: 28rpx; color: #94a3b8; }

.card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); position: relative; overflow: hidden; }
.card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4rpx; background: linear-gradient(90deg, #3b82f6, #60a5fa); }

.section-title { font-size: 32rpx; font-weight: 700; color: #1e293b; margin-bottom: 20rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-count { font-size: 26rpx; color: #94a3b8; font-weight: 600; }

.match-header { display: flex; justify-content: space-between; align-items: flex-start; }
.match-title { font-size: 34rpx; font-weight: 800; color: #1e293b; margin-bottom: 8rpx; }
.match-info { font-size: 26rpx; color: #64748b; margin-top: 4rpx; font-weight: 500; }
.match-deadline { font-size: 24rpx; color: #f97316; margin-top: 8rpx; font-weight: 600; }
.match-right { text-align: right; flex-shrink: 0; margin-left: 20rpx; }

.status-tag { display: inline-block; padding: 8rpx 16rpx; border-radius: 10rpx; font-size: 24rpx; font-weight: 700; }
.status-upcoming { background: linear-gradient(135deg, #dbeafe, #eff6ff); color: #1e40af; }
.status-ongoing { background: linear-gradient(135deg, #fef3c7, #fef9c8); color: #92400e; }
.status-completed { background: linear-gradient(135deg, #dcfce7, #f0fdf4); color: #166534; }

.new-badge { display: inline-block; background: #ef4444; color: #fff; font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 8rpx; font-weight: 700; vertical-align: middle; }

.btn-group { display: flex; gap: 16rpx; margin-top: 20rpx; }
.btn-primary { flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-align: center; padding: 24rpx 0; border-radius: 12rpx; font-size: 30rpx; font-weight: 700; }
.btn-secondary { flex: 1; background: #f1f5f9; color: #475569; text-align: center; padding: 20rpx 0; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; }

/* 管理员操作 */
.admin-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.admin-btn { display: flex; flex-direction: column; align-items: center; padding: 16rpx 0; background: #f8fafc; border-radius: 12rpx; gap: 6rpx; }
.admin-icon { font-size: 32rpx; }
.admin-label { font-size: 22rpx; color: #475569; font-weight: 600; }

/* 消息测试 */
.test-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.test-btn { background: #fff; border-radius: 12rpx; padding: 16rpx 0; text-align: center; font-size: 22rpx; color: #475569; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.05); font-weight: 600; }

/* 场主/护法 */
.owner-item { display: flex; align-items: center; gap: 16rpx; padding: 14rpx 0; border-bottom: 2rpx solid #f1f5f9; }
.owner-item:last-child { border-bottom: none; }
.owner-label { font-size: 24rpx; color: #94a3b8; width: 80rpx; font-weight: 600; }
.owner-name { font-size: 28rpx; color: #1e293b; flex: 1; font-weight: 600; }
.owner-action { font-size: 24rpx; color: #3b82f6; padding: 8rpx 18rpx; background: #eff6ff; border-radius: 10rpx; font-weight: 600; }

/* 报名接龙 */
.reg-item { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 2rpx solid #f1f5f9; }
.reg-item:last-child { border-bottom: none; }
.reg-info { flex: 1; min-width: 0; }
.reg-name-row { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.reg-tags { display: flex; gap: 6rpx; margin-top: 4rpx; flex-wrap: wrap; }
.reg-right { flex-shrink: 0; }
.reg-num { font-size: 24rpx; color: #94a3b8; font-weight: 600; min-width: 40rpx; }
.tag-wl { background: #fef3c7; color: #92400e; }
.wl-divider { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.wl-line { flex: 1; height: 2rpx; background: #e2e8f0; }
.wl-text { font-size: 24rpx; color: #94a3b8; font-weight: 600; flex-shrink: 0; }
.wl-item { background: #f8fafc; opacity: 0.8; }

.reg-actions-row { display: flex; gap: 8rpx; margin-top: 8rpx; flex-wrap: wrap; }
.btn-upload { background: #dbeafe; color: #2563eb; padding: 6rpx 14rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 600; }
.btn-confirm { background: #dcfce7; color: #16a34a; padding: 6rpx 14rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 600; }
.btn-delete-reg { background: #fee2e2; color: #dc2626; padding: 6rpx 14rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 600; }

.player-name-link { display: inline-block; color: #1e40af; cursor: pointer; font-weight: 600; }
.player-name-link:active { color: #3b82f6; }
.temp-tag { font-size: 24rpx; }
.ktt-tag { font-size: 22rpx; color: #94a3b8; }
.tag { display: inline-flex; align-items: center; padding: 4rpx 10rpx; border-radius: 8rpx; font-size: 20rpx; font-weight: 600; }
.tag-gray { background: #f1f5f9; color: #64748b; }
.tag-yellow { background: #fef3c7; color: #92400e; }
.tag-purple { background: #ede9fe; color: #5b21b6; }
.tag-blue { background: #dbeafe; color: #1e40af; }
.tag-red { background: #fee2e2; color: #991b1b; }

.status-confirmed { color: #16a34a; font-size: 24rpx; }
.status-pending { color: #f59e0b; font-size: 24rpx; }
.status-cancelled { color: #94a3b8; font-size: 24rpx; }

.empty-state { text-align: center; padding: 40rpx 0; color: #94a3b8; font-size: 28rpx; }

/* 赛况 */
.event-item { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0; }
.event-team-bar { width: 6rpx; height: 40rpx; border-radius: 3rpx; }
.event-time { font-size: 24rpx; color: #94a3b8; width: 60rpx; font-weight: 600; }
.event-detail { font-size: 28rpx; color: #1e293b; }

/* 评分 */
.rating-item { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 2rpx solid #f1f5f9; }

/* MVP */
.mvp-players { display: flex; gap: 16rpx; flex-wrap: wrap; }
.mvp-item { display: flex; align-items: center; gap: 10rpx; background: linear-gradient(135deg, #fefce8, #fef9c3); padding: 12rpx 20rpx; border-radius: 12rpx; }
.mvp-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: linear-gradient(135deg, #eab308, #fbbf24); display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 800; color: #fff; }
.mvp-name { font-size: 28rpx; font-weight: 700; color: #854d0e; }
.admin-mvp-btn { margin-top: 16rpx; padding: 16rpx 0; text-align: center; background: linear-gradient(135deg, #fefce8, #fef9c3); border-radius: 12rpx; font-size: 28rpx; font-weight: 700; color: #eab308; }

/* 自定义球员选择器 */
.picker-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.picker-popup { background: #fff; border-radius: 20rpx; width: 80%; max-height: 60vh; display: flex; flex-direction: column; }
.picker-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 28rpx; border-bottom: 2rpx solid #f1f5f9; }
.picker-title { font-size: 32rpx; font-weight: 700; color: #1e293b; }
.picker-close { font-size: 36rpx; color: #94a3b8; padding: 8rpx; }
.picker-body { max-height: 50vh; padding: 12rpx 0; }
.picker-item { display: flex; align-items: center; gap: 12rpx; padding: 20rpx 28rpx; border-bottom: 2rpx solid #f8fafc; }
.picker-item:active { background: #f8fafc; }
.picker-name { font-size: 30rpx; color: #1e293b; font-weight: 600; }
.picker-ktt { font-size: 24rpx; color: #94a3b8; }

.btn-preview { background: #fef3c7; color: #92400e; padding: 6rpx 14rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 600; }
.btn-cancel { background: #f1f5f9; color: #64748b; padding: 6rpx 14rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 600; }

/* 图片预览 */
.image-preview-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2000; padding: 40rpx; }
.image-preview-img { width: 100%; max-height: 80vh; }
.image-preview-close { color: #fff; font-size: 28rpx; margin-top: 20rpx; padding: 16rpx 40rpx; background: rgba(255,255,255,0.2); border-radius: 12rpx; }

/* 比分牌：与场次列表一致 */
.match-result { display: flex; align-items: flex-start; justify-content: space-between; margin-top: 20rpx; padding: 24rpx; background: linear-gradient(135deg, #f8fafc, #f0f9ff); border-radius: 16rpx; gap: 12rpx; }
.team-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12rpx; min-width: 0; }
.team { display: flex; align-items: center; gap: 12rpx; width: 100%; }
.team-a { justify-content: flex-start; }
.team-b { justify-content: flex-end; }
.team-dot { width: 28rpx; height: 28rpx; border-radius: 50%; flex-shrink: 0; border: 3rpx solid #fff; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15); }
.team-name { font-size: 28rpx; font-weight: 700; color: #374151; }
.team-score { font-size: 44rpx; font-weight: 900; color: #1e293b; }
.vs { font-size: 28rpx; font-weight: 800; color: #94a3b8; flex-shrink: 0; align-self: center; padding: 8rpx 12rpx; background: #f1f5f9; border-radius: 10rpx; }
.team-goals { width: 100%; display: flex; flex-direction: column; gap: 8rpx; }
.team-goal-item { display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; padding: 6rpx 0; }
.goal-icon { font-size: 22rpx; }
.goal-player { color: #374151; font-weight: 600; }
.own-goal-tag { color: #dc2626; font-size: 20rpx; margin-left: 4rpx; }
.goal-assist { color: #3b82f6; font-weight: 600; }
.goal-minute { color: #94a3b8; font-size: 22rpx; margin-left: auto; }

/* 两队队员 */
.lineups-header { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.lineup-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10rpx; padding: 16rpx 0; background: #f1f5f9; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; color: #64748b; }
.lineup-tab.active { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.lineup-dot { width: 20rpx; height: 20rpx; border-radius: 50%; }
.lineup-item { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 0; border-bottom: 2rpx solid #f1f5f9; }
.lineup-item:last-child { border-bottom: none; }
.lineup-player { font-size: 28rpx; color: #1e293b; font-weight: 600; }
.lineup-stats { display: flex; align-items: center; gap: 12rpx; }
.stat-goal { font-size: 24rpx; color: #dc2626; font-weight: 700; }
.stat-assist { font-size: 24rpx; color: #2563eb; font-weight: 700; }
.stat-rating { font-size: 24rpx; color: #f59e0b; font-weight: 700; background: #fef3c7; padding: 4rpx 12rpx; border-radius: 8rpx; }

/* 评分列表统计标注 */
.rating-left { display: flex; flex-direction: column; gap: 4rpx; }
.rating-name { font-size: 28rpx; color: #1e293b; font-weight: 600; }
.rating-badges { display: flex; gap: 8rpx; flex-wrap: wrap; }
.badge-goal { font-size: 22rpx; color: #dc2626; font-weight: 700; }
.badge-assist { font-size: 22rpx; color: #2563eb; font-weight: 700; }
.badge-yellow { font-size: 22rpx; color: #ca8a04; font-weight: 700; }
.badge-red { font-size: 22rpx; color: #dc2626; font-weight: 700; }
.badge-own { font-size: 22rpx; color: #7c3aed; font-weight: 700; }
.rating-right { display: flex; align-items: center; gap: 12rpx; }
.mvp-badge { font-size: 20rpx; color: #eab308; font-weight: 800; background: linear-gradient(135deg, #fefce8, #fef9c3); padding: 4rpx 10rpx; border-radius: 8rpx; }
.rating-score { font-size: 32rpx; color: #f59e0b; font-weight: 800; }

.collapse-arrow { font-size: 28rpx; color: #94a3b8; } /* 折叠箭头 */

.section-count-line { font-size: 26rpx; color: #94a3b8; font-weight: 600; margin-bottom: 12rpx; } /* 报名接龙顶部人数 */

/* 互评弹窗 */
.peer-summary { font-size: 26rpx; color: #94a3b8; padding: 16rpx 28rpx; border-bottom: 2rpx solid #f1f5f9; }
.peer-group-header { font-size: 30rpx; font-weight: 700; color: #1e293b; padding: 16rpx 28rpx 8rpx; background: #f8fafc; }
.peer-group-body { padding: 0 28rpx; }
.peer-rating-item { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 0; border-bottom: 2rpx solid #f8fafc; }
.peer-from { font-size: 28rpx; color: #4b5563; width: 160rpx; }
.peer-arrow { font-size: 24rpx; color: #94a3b8; }
.peer-score { font-size: 28rpx; color: #f59e0b; font-weight: 700; margin-left: auto; }

/* 手动排序 */
.sort-handle { font-size: 28rpx; padding: 4rpx 8rpx; cursor: pointer; }
.sort-handle:active { opacity: 0.5; }
</style>
