"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
const _sfc_main = {
  data() {
    return {
      loading: true,
      matchId: "",
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [], events: [], teamConfirmed: false, registrationClosed: false, ratingOpen: false },
      players: {},
      openid: "",
      isAdmin: false,
      currentPlayerId: "",
      matchRatings: {},
      posts: []
    };
  },
  computed: {
    statusText() {
      const map = { upcoming: "即将开始", ongoing: "进行中", completed: "已结束" };
      return map[this.match.status] || this.match.status;
    },
    statusClass() {
      const map = { upcoming: "status-upcoming", ongoing: "status-ongoing", completed: "status-completed" };
      return map[this.match.status] || "";
    },
    statusLabel() {
      if (this.match.status === "upcoming") {
        if (this.match.teamConfirmed)
          return "已分队";
        if (this.match.registrationClosed)
          return "已关闭";
        return "报名中";
      }
      if (this.match.status === "ongoing")
        return "比赛中";
      if (this.match.status === "completed")
        return this.match.ratingOpen ? "评分中" : "已完赛";
      return "";
    },
    isNew() {
      if (!this.match.createdAt)
        return false;
      let createdAt = this.match.createdAt;
      if (typeof createdAt === "object") {
        if (createdAt.iso)
          createdAt = createdAt.iso;
        else if (createdAt._date && createdAt._date.numberLong)
          createdAt = createdAt._date.numberLong;
        else if (createdAt._date)
          createdAt = createdAt._date;
        else
          return false;
      }
      if (typeof createdAt === "string" && /^\d+$/.test(createdAt)) {
        createdAt = parseInt(createdAt);
      }
      const created = new Date(createdAt);
      if (isNaN(created.getTime()))
        return false;
      const now = /* @__PURE__ */ new Date();
      return now - created < 24 * 60 * 60 * 1e3;
    },
    registrations() {
      return (this.match.registrations || []).map((r) => ({
        ...r,
        player: this.players[r.playerId] || {}
      }));
    },
    isRegistered() {
      var _a;
      return (_a = this.match.registrations) == null ? void 0 : _a.some((r) => r.playerId === this.currentPlayerId && r.status !== "cancelled");
    },
    ownerName() {
      var _a;
      return ((_a = this.players[this.match.ownerId]) == null ? void 0 : _a.nickname) || "待定";
    },
    confirmedPlayerIds() {
      return (this.match.registrations || []).filter((r) => r.status === "confirmed" || r.status === "screenshot_uploaded").map((r) => r.playerId);
    }
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadMatch();
  },
  onShareAppMessage() {
    const title = this.match.title || "比赛";
    const score = this.match.status === "completed" ? ` (${this.match.teamA.score}-${this.match.teamB.score})` : "";
    return {
      title: `${title}${score}`,
      path: `/pages/match/detail?id=${this.matchId}`
    };
  },
  methods: {
    async loadMatch() {
      var _a, _b;
      this.loading = true;
      try {
        const loginRes = await common_vendor.wx$1.cloud.callFunction({ name: "login" });
        this.openid = loginRes.result.openid;
        this.isAdmin = loginRes.result.isAdmin || false;
        this.currentPlayerId = loginRes.result.playerId || "";
        if (!this.currentPlayerId) {
          this.loading = false;
          common_vendor.index.showModal({
            title: "⚠️ 尚未注册",
            content: "您还没有注册球员信息，请先注册后再查看场次。",
            confirmText: "去注册",
            cancelText: "返回",
            success: (res) => {
              if (res.confirm) {
                common_vendor.index.switchTab({ url: "/pages/players/my" });
              } else {
                common_vendor.index.navigateBack();
              }
            }
          });
          return;
        }
        const { data } = await db.collection("matches").doc(this.matchId).get();
        this.match = data;
        const playerIds = [...new Set([
          ...(data.registrations || []).map((r) => r.playerId),
          data.ownerId,
          ...data.assistantIds || [],
          ...((_a = data.teamA) == null ? void 0 : _a.players) || [],
          ...((_b = data.teamB) == null ? void 0 : _b.players) || [],
          ...(data.events || []).map((e) => e.playerId),
          ...(data.lateQuitters || []).map((q) => q.playerId)
        ].filter(Boolean))];
        if (playerIds.length > 0) {
          try {
            const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "getPlayers" });
            const allPlayers = result.players || [];
            allPlayers.forEach((p) => {
              if (playerIds.includes(p._id)) {
                this.players[p._id] = p;
              }
            });
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/match/detail.vue:388", "加载球员信息失败", e);
          }
        }
        this.loadPosts();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/detail.vue:393", "加载失败", e);
      }
      this.loading = false;
    },
    showRegister() {
      this.doRegister(this.currentPlayerId);
    },
    async doRegister(playerId) {
      common_vendor.wx$1.showLoading({ title: "报名中" });
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({
          name: "registerMatch",
          data: { action: "register", matchId: this.matchId, playerId }
        });
        if (result.success) {
          common_vendor.index.showToast({ title: "报名成功" });
          this.loadMatch();
          if (result.status === "pending_screenshot") {
            const deadline = this.match.screenshotDeadline ? this.match.screenshotDeadline.replace("T", " ") : "";
            setTimeout(() => {
              common_vendor.index.showModal({
                title: "⚠️ 请上传截图",
                content: deadline ? `本场比赛需要抽场截图，请于 ${deadline} 前上传截图完成报名。` : "本场比赛需要抽场截图，请尽快上传截图完成报名。",
                confirmText: "现在上传",
                cancelText: "稍后",
                success: (res) => {
                  if (res.confirm)
                    this.uploadScreenshot();
                }
              });
            }, 500);
          }
        } else {
          common_vendor.index.showToast({ title: result.error || "报名失败", icon: "none" });
        }
      } catch (e) {
        common_vendor.index.showToast({ title: "报名失败", icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    },
    async cancelRegister(playerId) {
      common_vendor.index.showModal({
        title: "确认退出",
        content: "确定退出这场比赛的报名？",
        confirmColor: "#dc2626",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.wx$1.showLoading({ title: "处理中" });
            try {
              const { result } = await common_vendor.wx$1.cloud.callFunction({
                name: "registerMatch",
                data: { action: "unregister", matchId: this.matchId, playerId }
              });
              if (result.success) {
                common_vendor.index.showToast({ title: "已退出" });
                this.loadMatch();
              } else {
                common_vendor.index.showToast({ title: result.error || "退出失败", icon: "none" });
              }
            } catch (e) {
              common_vendor.index.showToast({ title: "退出失败", icon: "none" });
            }
            common_vendor.wx$1.hideLoading();
          }
        }
      });
    },
    async toggleRegistration() {
      const newVal = !this.match.registrationClosed;
      try {
        await db.collection("matches").doc(this.matchId).update({ data: { registrationClosed: newVal } });
        this.match.registrationClosed = newVal;
        common_vendor.index.showToast({ title: newVal ? "已关闭报名" : "已开启报名" });
      } catch (e) {
        common_vendor.index.showToast({ title: "操作失败", icon: "none" });
      }
    },
    goEdit() {
      common_vendor.index.navigateTo({ url: `/pages/match/edit?id=${this.matchId}` });
    },
    goTeamSplit() {
      common_vendor.index.navigateTo({ url: `/pages/match/teamSplit?id=${this.matchId}` });
    },
    goRecord() {
      common_vendor.index.navigateTo({ url: `/pages/match/record?id=${this.matchId}` });
    },
    goRate() {
      common_vendor.index.navigateTo({ url: `/pages/match/rate?id=${this.matchId}` });
    },
    goPlayerDetail(playerId) {
      if (!playerId)
        return;
      common_vendor.index.navigateTo({ url: `/pages/players/detail?id=${playerId}` });
    },
    async startMatch() {
      common_vendor.index.showModal({
        title: "开始比赛",
        content: "确定开始比赛？",
        confirmColor: "#16a34a",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.wx$1.showLoading({ title: "处理中" });
            try {
              await db.collection("matches").doc(this.matchId).update({ data: { status: "ongoing" } });
              common_vendor.index.showToast({ title: "比赛已开始" });
              this.loadMatch();
            } catch (e) {
              common_vendor.index.showToast({ title: "开始失败", icon: "none" });
            }
            common_vendor.wx$1.hideLoading();
          }
        }
      });
    },
    async endMatch() {
      common_vendor.index.showModal({
        title: "结束比赛",
        content: "确定结束比赛？",
        confirmColor: "#dc2626",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.wx$1.showLoading({ title: "处理中" });
            try {
              await db.collection("matches").doc(this.matchId).update({ data: { status: "completed" } });
              common_vendor.index.showToast({ title: "比赛已结束" });
              this.loadMatch();
            } catch (e) {
              common_vendor.index.showToast({ title: "结束失败", icon: "none" });
            }
            common_vendor.wx$1.hideLoading();
          }
        }
      });
    },
    async toggleRating() {
      const newVal = !this.match.ratingOpen;
      try {
        common_vendor.wx$1.showLoading({ title: "处理中" });
        await db.collection("matches").doc(this.matchId).update({ data: { ratingOpen: newVal } });
        this.match.ratingOpen = newVal;
        common_vendor.index.showToast({ title: newVal ? "评分已开启" : "评分已关闭" });
        if (newVal) {
          try {
            await common_vendor.wx$1.cloud.callFunction({ name: "sendNotification", data: { type: "rating_open", matchId: this.matchId } });
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/match/detail.vue:523", "评分通知发送失败", e);
          }
        }
      } catch (e) {
        common_vendor.index.showToast({ title: "操作失败", icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
      if (!newVal) {
        common_vendor.wx$1.showLoading({ title: "计算MVP中" });
        try {
          await common_vendor.wx$1.cloud.callFunction({ name: "recalculateStats" });
          common_vendor.index.showToast({ title: "MVP已计算" });
          this.loadMatch();
        } catch (e) {
          common_vendor.index.__f__("error", "at pages/match/detail.vue:530", "MVP计算失败", e);
          common_vendor.index.showToast({ title: "MVP计算失败", icon: "none" });
        }
        common_vendor.wx$1.hideLoading();
      }
    },
    async uploadScreenshot() {
      common_vendor.wx$1.showLoading({ title: "处理中" });
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({
          name: "registerMatch",
          data: { action: "uploadScreenshot", matchId: this.matchId, playerId: this.currentPlayerId }
        });
        if (result.success) {
          common_vendor.index.showToast({ title: "截图上传成功" });
          this.loadMatch();
        } else {
          common_vendor.index.showToast({ title: result.error || "上传失败", icon: "none" });
        }
      } catch (e) {
        common_vendor.index.showToast({ title: "上传失败", icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    },
    async confirmTeam() {
      common_vendor.index.showModal({
        title: "确认名单",
        content: "确认后将按优先级排序，超出上限的变为候补。确定？",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.wx$1.showLoading({ title: "处理中" });
            try {
              const { result } = await common_vendor.wx$1.cloud.callFunction({
                name: "registerMatch",
                data: { action: "confirmTeam", matchId: this.matchId }
              });
              if (result.success) {
                common_vendor.index.showToast({ title: "已确认名单" });
                this.loadMatch();
              } else {
                common_vendor.index.showToast({ title: result.error || "确认失败", icon: "none" });
              }
            } catch (e) {
              common_vendor.index.showToast({ title: "确认失败", icon: "none" });
            }
            common_vendor.wx$1.hideLoading();
          }
        }
      });
    },
    async deleteMatch() {
      common_vendor.index.showModal({
        title: "删除场次",
        content: "确定删除该场次？删除后不可恢复。",
        confirmColor: "#dc2626",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.wx$1.showLoading({ title: "删除中" });
            try {
              await db.collection("matches").doc(this.matchId).remove();
              common_vendor.index.showToast({ title: "已删除" });
              common_vendor.index.navigateBack();
            } catch (e) {
              common_vendor.index.showToast({ title: "删除失败", icon: "none" });
            }
            common_vendor.wx$1.hideLoading();
          }
        }
      });
    },
    async changeOwner() {
      const available = this.registrations.filter((r) => r.playerId && r.playerId !== this.match.ownerId);
      if (available.length === 0) {
        common_vendor.index.showToast({ title: "暂无报名人员", icon: "none" });
        return;
      }
      const items = available.map((r) => {
        var _a;
        return ((_a = r.player) == null ? void 0 : _a.nickname) || "未知";
      });
      common_vendor.index.showActionSheet({
        itemList: items.slice(0, 6),
        success: async (res) => {
          try {
            const playerId = available[res.tapIndex].playerId;
            await common_vendor.wx$1.cloud.callFunction({
              name: "updateMatch",
              data: { matchId: this.matchId, updateData: { ownerId: playerId } }
            });
            common_vendor.index.showToast({ title: "场主设定成功" });
            this.loadMatch();
          } catch (e) {
            common_vendor.index.showToast({ title: "设定失败", icon: "none" });
          }
        }
      });
    },
    async addAssistant() {
      var _a;
      const currentIds = ((_a = this.match) == null ? void 0 : _a.assistantIds) || [];
      if (currentIds.length >= 4) {
        common_vendor.index.showToast({ title: "护法最多4人", icon: "none" });
        return;
      }
      const available = this.registrations.filter((r) => r.playerId && r.playerId !== this.match.ownerId && !currentIds.includes(r.playerId));
      if (available.length === 0) {
        common_vendor.index.showToast({ title: "没有可添加的护法人选", icon: "none" });
        return;
      }
      const items = available.map((r) => {
        var _a2;
        return ((_a2 = r.player) == null ? void 0 : _a2.nickname) || "未知";
      });
      common_vendor.index.showActionSheet({
        itemList: items.slice(0, 6),
        success: async (res) => {
          try {
            const playerId = available[res.tapIndex].playerId;
            const newIds = [...currentIds, playerId];
            await common_vendor.wx$1.cloud.callFunction({
              name: "updateMatch",
              data: { matchId: this.matchId, updateData: { assistantIds: newIds, assistantId: newIds[0] } }
            });
            common_vendor.index.showToast({ title: "护法添加成功" });
            this.loadMatch();
          } catch (e) {
            common_vendor.index.showToast({ title: "添加失败", icon: "none" });
          }
        }
      });
    },
    async removeAssistant(playerId) {
      common_vendor.index.showModal({
        title: "确认移除",
        content: "确定移除该护法？",
        confirmColor: "#dc2626",
        success: async (res) => {
          var _a;
          if (res.confirm) {
            try {
              const newIds = (((_a = this.match) == null ? void 0 : _a.assistantIds) || []).filter((id) => id !== playerId);
              await common_vendor.wx$1.cloud.callFunction({
                name: "updateMatch",
                data: { matchId: this.matchId, updateData: { assistantIds: newIds, assistantId: newIds[0] || "" } }
              });
              common_vendor.index.showToast({ title: "已移除" });
              this.loadMatch();
            } catch (e) {
              common_vendor.index.showToast({ title: "移除失败", icon: "none" });
            }
          }
        }
      });
    },
    async testNotify(type) {
      try {
        await common_vendor.wx$1.cloud.callFunction({
          name: "sendNotification",
          data: { type, matchId: this.matchId, test: true }
        });
        common_vendor.index.showToast({ title: "已发送测试" });
      } catch (e) {
        common_vendor.index.showToast({ title: "发送失败", icon: "none" });
      }
    },
    isInTeamA(playerId) {
      var _a;
      return (((_a = this.match.teamA) == null ? void 0 : _a.players) || []).includes(playerId);
    },
    isInTeamB(playerId) {
      var _a;
      return (((_a = this.match.teamB) == null ? void 0 : _a.players) || []).includes(playerId);
    },
    getEventTeamColor(playerId) {
      var _a, _b;
      if (this.isInTeamA(playerId))
        return ((_a = this.match.teamA) == null ? void 0 : _a.color) || "#3b82f6";
      if (this.isInTeamB(playerId))
        return ((_b = this.match.teamB) == null ? void 0 : _b.color) || "#ef4444";
      return "#999";
    },
    formatTime(dateStr) {
      if (!dateStr)
        return "";
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
    },
    async loadPosts() {
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "getPosts", data: { matchId: this.matchId } });
        this.posts = result.posts || [];
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/detail.vue:661", "加载贴图失败", e);
      }
    },
    async uploadPostImage() {
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          common_vendor.wx$1.showLoading({ title: "上传中" });
          try {
            const tempFilePath = res.tempFilePaths[0];
            const cloudPath = `posts/${this.matchId}/${Date.now()}.jpg`;
            const uploadRes = await common_vendor.wx$1.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
            await common_vendor.wx$1.cloud.callFunction({ name: "createPost", data: { matchId: this.matchId, imageUrl: uploadRes.fileID } });
            common_vendor.index.showToast({ title: "上传成功" });
            this.loadPosts();
          } catch (e) {
            common_vendor.index.showToast({ title: "上传失败", icon: "none" });
          }
          common_vendor.wx$1.hideLoading();
        }
      });
    },
    async deletePost(postId) {
      common_vendor.index.showModal({
        title: "确认删除",
        content: "确定删除这张贴图？",
        confirmColor: "#dc2626",
        success: async (res) => {
          if (res.confirm) {
            try {
              await common_vendor.wx$1.cloud.callFunction({ name: "deletePost", data: { postId } });
              common_vendor.index.showToast({ title: "已删除" });
              this.loadPosts();
            } catch (e) {
              common_vendor.index.showToast({ title: "删除失败", icon: "none" });
            }
          }
        }
      });
    },
    async sendComment(post) {
      if (!post.commentText || !post.commentText.trim())
        return;
      try {
        await common_vendor.wx$1.cloud.callFunction({ name: "addComment", data: { postId: post._id, content: post.commentText.trim() } });
        post.commentText = "";
        this.loadPosts();
      } catch (e) {
        common_vendor.index.showToast({ title: "评论失败", icon: "none" });
      }
    },
    async deleteComment(commentId) {
      try {
        await common_vendor.wx$1.cloud.callFunction({ name: "deleteComment", data: { commentId } });
        this.loadPosts();
      } catch (e) {
        common_vendor.index.showToast({ title: "删除失败", icon: "none" });
      }
    },
    previewImage(url) {
      common_vendor.index.previewImage({ urls: [url] });
    },
    async showMVPSelector() {
      const confirmed = (this.match.registrations || []).filter((r) => r.status === "confirmed" || r.status === "screenshot_uploaded").map((r) => r.playerId);
      if (confirmed.length === 0) {
        common_vendor.index.showToast({ title: "暂无已确认球员", icon: "none" });
        return;
      }
      const items = confirmed.map((pid) => {
        var _a;
        return ((_a = this.players[pid]) == null ? void 0 : _a.nickname) || "未知";
      });
      const ids = confirmed;
      common_vendor.index.showActionSheet({
        itemList: items.slice(0, 6),
        success: async (res) => {
          try {
            await db.collection("matches").doc(this.matchId).update({ data: { mvp: [ids[res.tapIndex]] } });
            common_vendor.index.showToast({ title: "MVP 已指定" });
            this.loadMatch();
          } catch (e) {
            common_vendor.index.showToast({ title: "指定失败", icon: "none" });
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d, _e, _f;
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {} : $data.match ? common_vendor.e({
    c: common_vendor.t($data.match.title),
    d: $options.isNew
  }, $options.isNew ? {} : {}, {
    e: common_vendor.t($data.match.date),
    f: common_vendor.t($data.match.time),
    g: common_vendor.t($data.match.location),
    h: common_vendor.t($options.statusText),
    i: $data.match.screenshotDeadline
  }, $data.match.screenshotDeadline ? {
    j: common_vendor.t($data.match.screenshotDeadline)
  } : {}, {
    k: common_vendor.t($options.statusLabel),
    l: common_vendor.n($options.statusClass),
    m: $data.match.status !== "upcoming"
  }, $data.match.status !== "upcoming" ? {
    n: ((_a = $data.match.teamA) == null ? void 0 : _a.color) || "#16a34a",
    o: common_vendor.t(((_b = $data.match.teamA) == null ? void 0 : _b.name) || "A队"),
    p: common_vendor.t(((_c = $data.match.teamA) == null ? void 0 : _c.score) || 0),
    q: common_vendor.t(((_d = $data.match.teamB) == null ? void 0 : _d.score) || 0),
    r: common_vendor.t(((_e = $data.match.teamB) == null ? void 0 : _e.name) || "B队"),
    s: ((_f = $data.match.teamB) == null ? void 0 : _f.color) || "#dc2626"
  } : {}, {
    t: $options.isRegistered && $data.match.status === "upcoming"
  }, $options.isRegistered && $data.match.status === "upcoming" ? {
    v: common_vendor.o(($event) => $options.cancelRegister($data.currentPlayerId), "f5")
  } : {}, {
    w: $data.isAdmin
  }, $data.isAdmin ? common_vendor.e({
    x: $data.match.status === "upcoming"
  }, $data.match.status === "upcoming" ? {
    y: common_vendor.o((...args) => $options.goEdit && $options.goEdit(...args), "0a")
  } : {}, {
    z: $data.match.status === "upcoming"
  }, $data.match.status === "upcoming" ? {
    A: common_vendor.t($data.match.teamConfirmed ? "重新确认" : "确认名单"),
    B: common_vendor.o((...args) => $options.confirmTeam && $options.confirmTeam(...args), "b6")
  } : {}, {
    C: $data.match.status === "upcoming"
  }, $data.match.status === "upcoming" ? {
    D: common_vendor.t($data.match.registrationClosed ? "开启报名" : "关闭报名"),
    E: common_vendor.o((...args) => $options.toggleRegistration && $options.toggleRegistration(...args), "83")
  } : {}, {
    F: common_vendor.o((...args) => $options.goTeamSplit && $options.goTeamSplit(...args), "89"),
    G: common_vendor.t($data.match.status === "completed" ? "查看赛况" : "记录赛况"),
    H: common_vendor.o((...args) => $options.goRecord && $options.goRecord(...args), "bb"),
    I: $data.match.status === "upcoming"
  }, $data.match.status === "upcoming" ? {
    J: common_vendor.o((...args) => $options.changeOwner && $options.changeOwner(...args), "31")
  } : {}, {
    K: $data.match.status === "upcoming"
  }, $data.match.status === "upcoming" ? {
    L: common_vendor.o((...args) => $options.startMatch && $options.startMatch(...args), "26")
  } : {}, {
    M: $data.match.status === "ongoing"
  }, $data.match.status === "ongoing" ? {
    N: common_vendor.o((...args) => $options.endMatch && $options.endMatch(...args), "fa")
  } : {}, {
    O: $data.match.status === "completed"
  }, $data.match.status === "completed" ? {
    P: common_vendor.t($data.match.ratingOpen ? "关闭评分" : "开启评分"),
    Q: common_vendor.o((...args) => $options.toggleRating && $options.toggleRating(...args), "c4")
  } : {}, {
    R: common_vendor.o((...args) => $options.deleteMatch && $options.deleteMatch(...args), "88")
  }) : {}, {
    S: $data.isAdmin
  }, $data.isAdmin ? {
    T: common_vendor.o(($event) => $options.testNotify("new_match"), "61"),
    U: common_vendor.o(($event) => $options.testNotify("confirm_team"), "5c"),
    V: common_vendor.o(($event) => $options.testNotify("team_split"), "40"),
    W: common_vendor.o(($event) => $options.testNotify("rating_open"), "1d"),
    X: common_vendor.o(($event) => $options.testNotify("owner_reminder_24h"), "e1"),
    Y: common_vendor.o(($event) => $options.testNotify("owner_reminder_3h"), "0b"),
    Z: common_vendor.o(($event) => $options.testNotify("assistant_reminder_24h"), "b7"),
    aa: common_vendor.o(($event) => $options.testNotify("assistant_reminder_3h"), "e0")
  } : {}, {
    ab: $data.match.ownerId || ($data.match.assistantIds || []).length > 0
  }, $data.match.ownerId || ($data.match.assistantIds || []).length > 0 ? common_vendor.e({
    ac: common_vendor.t($options.ownerName),
    ad: $data.isAdmin
  }, $data.isAdmin ? {
    ae: common_vendor.o((...args) => $options.changeOwner && $options.changeOwner(...args), "fe")
  } : {}, {
    af: common_vendor.f($data.match.assistantIds || [], (aid, k0, i0) => {
      var _a2;
      return common_vendor.e({
        a: common_vendor.t(((_a2 = $data.players[aid]) == null ? void 0 : _a2.nickname) || "?")
      }, $data.isAdmin ? {
        b: common_vendor.o(($event) => $options.removeAssistant(aid), aid)
      } : {}, {
        c: aid
      });
    }),
    ag: $data.isAdmin,
    ah: $data.isAdmin && ($data.match.assistantIds || []).length < 4
  }, $data.isAdmin && ($data.match.assistantIds || []).length < 4 ? {
    ai: common_vendor.o((...args) => $options.addAssistant && $options.addAssistant(...args), "5e")
  } : {}) : {}, {
    aj: common_vendor.t($options.registrations.length),
    ak: $options.registrations.length > 0
  }, $options.registrations.length > 0 ? {
    al: common_vendor.f($options.registrations, (r, index, i0) => {
      var _a2, _b2, _c2, _d2, _e2;
      return common_vendor.e({
        a: r.isTempPlayer
      }, r.isTempPlayer ? {} : {}, {
        b: common_vendor.t(r.isTempPlayer ? r.tempNickname : ((_a2 = r.player) == null ? void 0 : _a2.nickname) || "未知"),
        c: common_vendor.o(($event) => !r.isTempPlayer && $options.goPlayerDetail(r.playerId), r.playerId),
        d: (_b2 = r.player) == null ? void 0 : _b2.kttLast4
      }, ((_c2 = r.player) == null ? void 0 : _c2.kttLast4) ? {
        e: common_vendor.t(r.player.kttLast4)
      } : {}, {
        f: r.isTempPlayer
      }, r.isTempPlayer ? {} : {}, {
        g: $data.match.ownerId === r.playerId
      }, $data.match.ownerId === r.playerId ? {} : {}, {
        h: ($data.match.assistantIds || []).includes(r.playerId)
      }, ($data.match.assistantIds || []).includes(r.playerId) ? {} : {}, {
        i: !r.isTempPlayer && $options.isInTeamA(r.playerId)
      }, !r.isTempPlayer && $options.isInTeamA(r.playerId) ? {
        j: common_vendor.t((((_d2 = $data.match.teamA) == null ? void 0 : _d2.name) || "A队").replace(/[🔴🔵]/g, "").trim())
      } : !r.isTempPlayer && $options.isInTeamB(r.playerId) ? {
        l: common_vendor.t((((_e2 = $data.match.teamB) == null ? void 0 : _e2.name) || "B队").replace(/[🔴🔵]/g, "").trim())
      } : {}, {
        k: !r.isTempPlayer && $options.isInTeamB(r.playerId),
        m: r.status === "confirmed" || r.status === "screenshot_uploaded"
      }, r.status === "confirmed" || r.status === "screenshot_uploaded" ? {} : r.status === "pending_screenshot" ? {} : r.status === "cancelled" ? {} : {}, {
        n: r.status === "pending_screenshot",
        o: r.status === "cancelled",
        p: r.playerId
      });
    })
  } : {}, {
    am: !$options.isRegistered && $data.match.status === "upcoming" && !$data.match.registrationClosed
  }, !$options.isRegistered && $data.match.status === "upcoming" && !$data.match.registrationClosed ? {
    an: common_vendor.o((...args) => $options.showRegister && $options.showRegister(...args), "8f")
  } : {}, {
    ao: $data.match.events && $data.match.events.length > 0
  }, $data.match.events && $data.match.events.length > 0 ? {
    ap: common_vendor.f($data.match.events, (e, k0, i0) => {
      var _a2, _b2, _c2, _d2, _e2;
      return common_vendor.e({
        a: $options.getEventTeamColor(e.playerId),
        b: common_vendor.t(e.minute),
        c: e.type === "goal"
      }, e.type === "goal" ? {
        d: common_vendor.t((_a2 = $data.players[e.playerId]) == null ? void 0 : _a2.nickname)
      } : e.type === "assist" ? {
        f: common_vendor.t((_b2 = $data.players[e.playerId]) == null ? void 0 : _b2.nickname)
      } : e.type === "yellow" ? {
        h: common_vendor.t((_c2 = $data.players[e.playerId]) == null ? void 0 : _c2.nickname)
      } : e.type === "red" ? {
        j: common_vendor.t((_d2 = $data.players[e.playerId]) == null ? void 0 : _d2.nickname)
      } : e.type === "ownGoal" || e.type === "own_goal" ? {
        l: common_vendor.t((_e2 = $data.players[e.playerId]) == null ? void 0 : _e2.nickname)
      } : {}, {
        e: e.type === "assist",
        g: e.type === "yellow",
        i: e.type === "red",
        k: e.type === "ownGoal" || e.type === "own_goal",
        m: e.id
      });
    })
  } : {}, {
    aq: $data.match.status === "completed" && $data.match.ratingOpen
  }, $data.match.status === "completed" && $data.match.ratingOpen ? {
    ar: common_vendor.f($options.confirmedPlayerIds, (pid, idx, i0) => {
      var _a2;
      return {
        a: common_vendor.t((_a2 = $data.players[pid]) == null ? void 0 : _a2.nickname),
        b: common_vendor.t(($data.matchRatings[pid] || 5).toFixed(1)),
        c: pid
      };
    }),
    as: common_vendor.o((...args) => $options.goRate && $options.goRate(...args), "4f")
  } : {}, {
    at: $data.match.mvp && $data.match.mvp.length > 0
  }, $data.match.mvp && $data.match.mvp.length > 0 ? common_vendor.e({
    av: common_vendor.f($data.match.mvp, (pid, k0, i0) => {
      var _a2, _b2, _c2;
      return {
        a: common_vendor.t(((_b2 = (_a2 = $data.players[pid]) == null ? void 0 : _a2.nickname) == null ? void 0 : _b2[0]) || "?"),
        b: common_vendor.t(((_c2 = $data.players[pid]) == null ? void 0 : _c2.nickname) || "未知"),
        c: pid
      };
    }),
    aw: $data.isAdmin && $data.match.status === "completed"
  }, $data.isAdmin && $data.match.status === "completed" ? {
    ax: common_vendor.o((...args) => $options.showMVPSelector && $options.showMVPSelector(...args), "1d")
  } : {}) : {}, {
    ay: common_vendor.t($data.posts.length),
    az: $data.posts.length === 0
  }, $data.posts.length === 0 ? {} : {
    aA: common_vendor.f($data.posts, (post, k0, i0) => {
      var _a2;
      return common_vendor.e({
        a: common_vendor.t(((_a2 = post.playerName) == null ? void 0 : _a2[0]) || "?"),
        b: common_vendor.t(post.playerName || "未知"),
        c: common_vendor.t($options.formatTime(post.createdAt)),
        d: $data.isAdmin || post.playerId === $data.currentPlayerId
      }, $data.isAdmin || post.playerId === $data.currentPlayerId ? {
        e: common_vendor.o(($event) => $options.deletePost(post._id), post._id)
      } : {}, {
        f: post.imageUrl,
        g: common_vendor.o(($event) => $options.previewImage(post.imageUrl), post._id),
        h: post.comments && post.comments.length > 0
      }, post.comments && post.comments.length > 0 ? {
        i: common_vendor.f(post.comments, (comment, k1, i1) => {
          return common_vendor.e({
            a: common_vendor.t(comment.playerName || "未知"),
            b: common_vendor.t(comment.content),
            c: $data.isAdmin || comment.playerId === $data.currentPlayerId
          }, $data.isAdmin || comment.playerId === $data.currentPlayerId ? {
            d: common_vendor.o(($event) => $options.deleteComment(comment._id), comment._id)
          } : {}, {
            e: comment._id
          });
        })
      } : {}, {
        j: post.commentText,
        k: common_vendor.o(($event) => post.commentText = $event.detail.value, post._id),
        l: common_vendor.o(($event) => $options.sendComment(post), post._id),
        m: post._id
      });
    })
  }, {
    aB: common_vendor.o((...args) => $options.uploadPostImage && $options.uploadPostImage(...args), "e2")
  }) : {}, {
    b: $data.match
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4a845a36"]]);
_sfc_main.__runtimeHooks = 2;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/match/detail.js.map
