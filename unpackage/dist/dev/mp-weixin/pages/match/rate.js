"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
const _ = db.command;
const POSITIONS = [
  { id: "GK", name: "门将" },
  { id: "CB", name: "中后卫" },
  { id: "LB", name: "左后卫" },
  { id: "RB", name: "右后卫" },
  { id: "CDM", name: "后腰" },
  { id: "CM", name: "中场" },
  { id: "CAM", name: "前腰" },
  { id: "LW", name: "左边锋" },
  { id: "RW", name: "右边锋" },
  { id: "ST", name: "前锋" },
  { id: "CF", name: "中锋" }
];
const _sfc_main = {
  data() {
    return {
      matchId: "",
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [], events: [] },
      players: {},
      openid: "",
      currentPlayerId: "",
      isAdmin: false,
      peerScores: {},
      adminScores: {}
    };
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadData();
  },
  computed: {
    allPlayers() {
      var _a, _b;
      if (!this.match)
        return [];
      const tempIds = new Set((this.match.registrations || []).filter((r) => r.isTempPlayer).map((r) => r.playerId));
      const ids = [...new Set([
        ...(this.match.registrations || []).filter((r) => !r.isTempPlayer && r.status === "confirmed").map((r) => r.playerId),
        ...((_a = this.match.teamA) == null ? void 0 : _a.players) || [],
        ...((_b = this.match.teamB) == null ? void 0 : _b.players) || [],
        ...(this.match.events || []).map((e) => e.playerId)
      ].filter((id) => !tempIds.has(id) && id))];
      const players = ids.map((id) => this.players[id]).filter(Boolean);
      return players;
    },
    teammates() {
      return this.allPlayers.filter((p) => p._id !== this.currentPlayerId && p.allowRating !== false);
    },
    isPlayer() {
      const confirmedIds = (this.match.registrations || []).filter((r) => !r.isTempPlayer && r.status === "confirmed").map((r) => r.playerId);
      return confirmedIds.includes(this.currentPlayerId);
    },
    isRateWindowOpen() {
      var _a;
      return ((_a = this.match) == null ? void 0 : _a.ratingOpen) === true;
    },
    rateWindowStatus() {
      var _a;
      if (!((_a = this.match) == null ? void 0 : _a.ratingOpen))
        return "评分窗口已关闭（管理员未开启）";
      return "评分窗口开放中";
    }
  },
  methods: {
    async loadData() {
      var _a, _b, _c, _d;
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "login" });
        this.openid = result.openid;
        this.isAdmin = result.isAdmin;
        this.currentPlayerId = result.playerId || "";
        const { data } = await db.collection("matches").doc(this.matchId).get();
        this.match = data;
        this.matchId = data._id || this.matchId;
        const playerIds = [...new Set([
          ...(data.registrations || []).filter((r) => r.status === "confirmed" || r.status === "pending_screenshot").map((r) => r.playerId),
          ...((_a = data.teamA) == null ? void 0 : _a.players) || [],
          ...((_b = data.teamB) == null ? void 0 : _b.players) || [],
          ...(data.events || []).map((e) => e.playerId),
          data.ownerId,
          data.assistantId,
          ...data.assistantIds || []
        ].filter(Boolean))];
        if (playerIds.length > 0) {
          let pList = [];
          try {
            const { result: allPlayersRes } = await common_vendor.wx$1.cloud.callFunction({ name: "getPlayers" });
            if (allPlayersRes && allPlayersRes.players) {
              pList = allPlayersRes.players.filter((p) => playerIds.includes(p._id));
            }
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/match/rate.vue:179", "getPlayers 调用失败:", e);
            try {
              const { data: data2 } = await db.collection("players").where({ _id: _.in(playerIds) }).get();
              pList = data2 || [];
            } catch (e2) {
              common_vendor.index.__f__("error", "at pages/match/rate.vue:187", "客户端查询也失败:", e2);
            }
          }
          const newPlayers = {};
          pList.forEach((p) => {
            newPlayers[p._id] = p;
          });
          this.players = newPlayers;
          const peerScores = {};
          const adminScores = {};
          for (const p of Object.values(newPlayers)) {
            if (!p._id || p._id === this.currentPlayerId)
              continue;
            const existingPeer = ((_c = p.ratings) == null ? void 0 : _c.peerRatings) || [];
            const peerScore = existingPeer.filter((r) => r.matchId === this.matchId).find((r) => r.fromId === this.currentPlayerId);
            peerScores[p._id] = peerScore ? peerScore.score : 0;
            if (this.isAdmin) {
              const existingAdmin = ((_d = p.ratings) == null ? void 0 : _d.adminRatings) || [];
              const adminScore = existingAdmin.filter((r) => r.matchId === this.matchId).find((r) => r.fromId === this.currentPlayerId);
              adminScores[p._id] = adminScore ? adminScore.score : 0;
            }
          }
          this.peerScores = peerScores;
          this.adminScores = adminScores;
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/rate.vue:219", e);
      }
      common_vendor.wx$1.hideLoading();
    },
    getPositions(p) {
      if (!(p == null ? void 0 : p.positions))
        return "";
      return p.positions.map((pos) => {
        var _a;
        return ((_a = POSITIONS.find((pt) => pt.id === pos)) == null ? void 0 : _a.name) || pos;
      }).join(" ");
    },
    setPeerScore(id, score) {
      this.peerScores = { ...this.peerScores, [id]: score };
    },
    setAdminScore(id, score) {
      this.adminScores = { ...this.adminScores, [id]: score };
    },
    async submit() {
      const peerCount = Object.values(this.peerScores).filter((s) => s > 0).length;
      const adminCount = Object.values(this.adminScores).filter((s) => s > 0).length;
      const totalCount = peerCount + adminCount;
      if (totalCount === 0) {
        common_vendor.index.showToast({ title: "您没有给任何人打分", icon: "none" });
        return;
      }
      const confirmRes = await new Promise((resolve) => {
        common_vendor.index.showModal({
          title: "确认提交",
          content: `即将提交 ${peerCount} 条队友互评 + ${adminCount} 条管理员评分，共 ${totalCount} 条评分。确认？`,
          success: resolve
        });
      });
      if (!confirmRes.confirm)
        return;
      common_vendor.wx$1.showLoading({ title: "提交中" });
      try {
        const peerRatings = Object.entries(this.peerScores).filter(([_2, score]) => score > 0).map(([pid, score]) => ({ pid, score }));
        const adminRatings = Object.entries(this.adminScores).filter(([_2, score]) => score > 0).map(([pid, score]) => ({ pid, score }));
        common_vendor.index.__f__("log", "at pages/match/rate.vue:262", "提交评分数据:", { matchId: this.matchId, peerRatings, adminRatings, fromId: this.currentPlayerId });
        const { result } = await common_vendor.wx$1.cloud.callFunction({
          name: "submitRating",
          data: {
            matchId: this.matchId,
            peerRatings,
            adminRatings,
            fromId: this.currentPlayerId
          }
        });
        common_vendor.index.__f__("log", "at pages/match/rate.vue:275", "submitRating 返回:", result);
        if (!result || !result.success) {
          throw new Error((result == null ? void 0 : result.error) || "云函数返回失败");
        }
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        await common_vendor.wx$1.cloud.callFunction({ name: "recalculateStats" });
        common_vendor.index.showToast({ title: "评分已提交" });
        setTimeout(() => common_vendor.index.navigateBack(), 800);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/rate.vue:290", "提交失败详情:", e);
        common_vendor.index.showToast({ title: "提交失败: " + (e.message || e.errMsg || JSON.stringify(e)), icon: "none", duration: 3e3 });
      }
      common_vendor.wx$1.hideLoading();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.match
  }, $data.match ? common_vendor.e({
    b: common_vendor.t($data.match.title),
    c: common_vendor.t($data.match.date),
    d: !$options.isRateWindowOpen
  }, !$options.isRateWindowOpen ? {
    e: common_vendor.t($options.rateWindowStatus)
  } : {}, {
    f: $options.isPlayer && $options.isRateWindowOpen
  }, $options.isPlayer && $options.isRateWindowOpen ? {
    g: common_vendor.f($options.teammates, (p, k0, i0) => {
      return {
        a: common_vendor.t(p.nickname[0]),
        b: common_vendor.t(p.nickname),
        c: common_vendor.f(10, (i, k1, i1) => {
          return {
            a: common_vendor.t(i),
            b: i,
            c: ($data.peerScores[p._id] || 0) >= i ? 1 : "",
            d: common_vendor.o(($event) => $options.setPeerScore(p._id, i), i)
          };
        }),
        d: common_vendor.t($data.peerScores[p._id] || 0),
        e: p._id
      };
    })
  } : {}, {
    h: $data.isAdmin && $options.isRateWindowOpen
  }, $data.isAdmin && $options.isRateWindowOpen ? {
    i: common_vendor.f($options.allPlayers, (p, k0, i0) => {
      return {
        a: common_vendor.t(p.nickname[0]),
        b: common_vendor.t(p.nickname),
        c: common_vendor.f(10, (i, k1, i1) => {
          return {
            a: common_vendor.t(i),
            b: i,
            c: ($data.adminScores[p._id] || 0) >= i ? 1 : "",
            d: common_vendor.o(($event) => $options.setAdminScore(p._id, i), i)
          };
        }),
        d: common_vendor.t($data.adminScores[p._id] || 0),
        e: p._id
      };
    })
  } : {}, {
    j: !$options.isPlayer && !$data.isAdmin
  }, !$options.isPlayer && !$data.isAdmin ? {} : {}, {
    k: ($options.isPlayer || $data.isAdmin) && $options.isRateWindowOpen
  }, ($options.isPlayer || $data.isAdmin) && $options.isRateWindowOpen ? {
    l: common_vendor.o((...args) => $options.submit && $options.submit(...args), "ec")
  } : {}, {
    m: ($options.isPlayer || $data.isAdmin) && $options.isRateWindowOpen
  }, ($options.isPlayer || $data.isAdmin) && $options.isRateWindowOpen ? {
    n: common_vendor.t(($options.isPlayer ? Object.values($data.peerScores).filter((s) => s > 0).length : 0) + ($data.isAdmin ? Object.values($data.adminScores).filter((s) => s > 0).length : 0))
  } : {}) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0953630a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/match/rate.js.map
