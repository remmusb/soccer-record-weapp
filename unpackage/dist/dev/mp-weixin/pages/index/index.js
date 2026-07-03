"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
const _sfc_main = {
  data() {
    return {
      allMatches: [],
      players: {},
      isAdmin: false
    };
  },
  computed: {
    ongoing() {
      return this.allMatches.filter((m) => m.status === "ongoing");
    },
    upcoming() {
      return this.allMatches.filter((m) => m.status === "upcoming").sort((a, b) => {
        const dateA = /* @__PURE__ */ new Date(a.date + "T" + (a.time || "00:00"));
        const dateB = /* @__PURE__ */ new Date(b.date + "T" + (b.time || "00:00"));
        return dateA - dateB;
      });
    },
    completed() {
      return this.allMatches.filter((m) => m.status === "completed");
    }
  },
  onShow() {
    this.loadMatches();
    this.checkAdmin();
    common_vendor.wx$1.showShareMenu({ withShareTicket: true });
  },
  onShareAppMessage() {
    return {
      title: "⚽ 足球记录 - 记录每一场野球",
      path: "/pages/index/index",
      imageUrl: ""
    };
  },
  methods: {
    async checkAdmin() {
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "login" });
        this.isAdmin = result.isAdmin || false;
      } catch (e) {
        this.isAdmin = false;
      }
    },
    async loadMatches() {
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const { data } = await db.collection("matches").orderBy("date", "desc").get();
        this.allMatches = data;
        const ownerIds = [...new Set(data.filter((m) => m.ownerId).map((m) => m.ownerId))];
        const assistantIds = [...new Set(data.flatMap((m) => m.assistantIds || []).filter(Boolean))];
        const eventPlayerIds = [...new Set(data.flatMap(
          (m) => (m.events || []).flatMap((e) => [e.playerId, e.assistById].filter(Boolean))
        ))];
        const playerIds = [.../* @__PURE__ */ new Set([...ownerIds, ...assistantIds, ...eventPlayerIds])];
        if (playerIds.length > 0) {
          const { data: players } = await db.collection("players").where({ _id: db.command.in(playerIds) }).get();
          players.forEach((p) => {
            this.players[p._id] = p.nickname;
          });
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:188", "加载失败", e);
      }
      common_vendor.wx$1.hideLoading();
    },
    getPlayerName(id) {
      return this.players[id] || "";
    },
    formatAssistants(m) {
      const ids = m.assistantIds || [];
      if (ids.length === 0)
        return "";
      const names = ids.map((id) => this.players[id] || "?").filter(Boolean);
      return names.join("、");
    },
    formatDeadline(dt) {
      if (!dt)
        return "";
      return dt.replace("T", " ");
    },
    getGoals(m) {
      return (m.events || []).filter((e) => e.type === "goal").length;
    },
    getAssists(m) {
      return (m.events || []).filter((e) => e.type === "goal" && e.assistById).length;
    },
    getColorTeamName(color) {
      if (!color)
        return "";
      const text = String(color).trim().toLowerCase();
      if (text.includes("白") || text.includes("white"))
        return "白队";
      if (text.includes("黑") || text.includes("black"))
        return "黑队";
      if (text.includes("灰") || text.includes("grey") || text.includes("gray"))
        return "灰队";
      if (text.includes("红") || text.includes("red"))
        return "红队";
      if (text.includes("橙") || text.includes("orange"))
        return "橙队";
      if (text.includes("黄") || text.includes("yellow"))
        return "黄队";
      if (text.includes("绿") || text.includes("green"))
        return "绿队";
      if (text.includes("青") || text.includes("cyan") || text.includes("teal"))
        return "青队";
      if (text.includes("蓝") || text.includes("blue"))
        return "蓝队";
      if (text.includes("紫") || text.includes("purple") || text.includes("violet"))
        return "紫队";
      if (text.includes("粉") || text.includes("pink") || text.includes("玫"))
        return "粉队";
      let hex = text.replace("#", "").replace(/^0x/, "");
      if (!/^[0-9a-f]{3,8}$/i.test(hex))
        return "";
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length < 6)
        return "";
      hex = hex.substring(0, 6);
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      if (max > 220 && min > 220)
        return "白队";
      if (max < 60)
        return "黑队";
      if (diff < 40 && min > 80)
        return "灰队";
      if (r > 150 && g < 100 && b < 100)
        return "红队";
      if (r > 180 && g > 100 && g < 150 && b < 100)
        return "橙队";
      if (r > 180 && g > 150 && b < 120)
        return "黄队";
      if (g > 120 && r < g * 0.7 && b < g * 0.7)
        return "绿队";
      if (g > 100 && b > 100 && r < g * 0.5 && r < b * 0.5)
        return "青队";
      if (b > 150 && r < 120 && g < 120)
        return "蓝队";
      if (b > 120 && r > 120 && g < 100)
        return "紫队";
      if (r > 180 && g > 100 && g < 150 && b > 150)
        return "粉队";
      return "";
    },
    getTeamAGoals(m) {
      var _a;
      const aPlayers = new Set(((_a = m.teamA) == null ? void 0 : _a.players) || []);
      const allEvents = m.events || [];
      const assistEvents = allEvents.filter((e) => e.type === "assist");
      return allEvents.filter((e) => e.type === "goal" && aPlayers.has(e.playerId) || e.type === "own_goal" && !aPlayers.has(e.playerId)).map((g) => {
        const assist = assistEvents.find((a) => a.assistById === g.playerId && a.minute === g.minute);
        return { ...g, assistById: assist ? assist.playerId : g.assistById, isOwnGoal: g.type === "own_goal" };
      });
    },
    getTeamBGoals(m) {
      var _a;
      const bPlayers = new Set(((_a = m.teamB) == null ? void 0 : _a.players) || []);
      const allEvents = m.events || [];
      const assistEvents = allEvents.filter((e) => e.type === "assist");
      return allEvents.filter((e) => e.type === "goal" && bPlayers.has(e.playerId) || e.type === "own_goal" && !bPlayers.has(e.playerId)).map((g) => {
        const assist = assistEvents.find((a) => a.assistById === g.playerId && a.minute === g.minute);
        return { ...g, assistById: assist ? assist.playerId : g.assistById, isOwnGoal: g.type === "own_goal" };
      });
    },
    getTeamColor(m, playerId) {
      var _a, _b, _c, _d;
      if ((((_a = m.teamA) == null ? void 0 : _a.players) || []).includes(playerId))
        return ((_b = m.teamA) == null ? void 0 : _b.color) || "#16a34a";
      if ((((_c = m.teamB) == null ? void 0 : _c.players) || []).includes(playerId))
        return ((_d = m.teamB) == null ? void 0 : _d.color) || "#dc2626";
      return "#9ca3af";
    },
    isNewMatch(m) {
      if (!m.createdAt)
        return false;
      let createdAt = m.createdAt;
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
      const diff = now - created;
      return diff < 24 * 60 * 60 * 1e3;
    },
    getUpcomingStatusText(m) {
      if (m.teamConfirmed)
        return "已分队";
      if (m.registrationClosed)
        return "已关闭报名";
      return "报名中";
    },
    getUpcomingStatusClass(m) {
      if (m.teamConfirmed)
        return "status-split";
      if (m.registrationClosed)
        return "status-closed";
      return "status-upcoming";
    },
    goCreate() {
      common_vendor.index.navigateTo({ url: "/pages/match/create" });
    },
    goDetail(id) {
      common_vendor.index.navigateTo({ url: `/pages/match/detail?id=${id}` });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.isAdmin
  }, $data.isAdmin ? {
    b: common_vendor.o((...args) => $options.goCreate && $options.goCreate(...args), "ca")
  } : {}, {
    c: $options.ongoing.length > 0
  }, $options.ongoing.length > 0 ? {
    d: common_vendor.f($options.ongoing, (m, k0, i0) => {
      var _a;
      return common_vendor.e({
        a: common_vendor.t(m.title),
        b: $options.isNewMatch(m)
      }, $options.isNewMatch(m) ? {} : {}, {
        c: common_vendor.t(m.location || "待定"),
        d: common_vendor.t(m.date),
        e: common_vendor.t(m.time),
        f: common_vendor.t(((_a = m.registrations) == null ? void 0 : _a.length) || 0),
        g: common_vendor.t(m.maxPlayers),
        h: m.ownerId
      }, m.ownerId ? common_vendor.e({
        i: common_vendor.t($options.getPlayerName(m.ownerId)),
        j: (m.assistantIds || []).length > 0
      }, (m.assistantIds || []).length > 0 ? {
        k: common_vendor.t($options.formatAssistants(m))
      } : {}) : {}, {
        l: m._id,
        m: common_vendor.o(($event) => $options.goDetail(m._id), m._id)
      });
    })
  } : {}, {
    e: $options.upcoming.length > 0
  }, $options.upcoming.length > 0 ? {
    f: common_vendor.f($options.upcoming, (m, k0, i0) => {
      var _a;
      return common_vendor.e({
        a: common_vendor.t(m.title),
        b: $options.isNewMatch(m)
      }, $options.isNewMatch(m) ? {} : {}, {
        c: common_vendor.t(m.location || "待定"),
        d: common_vendor.t(m.date),
        e: common_vendor.t(m.time),
        f: common_vendor.t(((_a = m.registrations) == null ? void 0 : _a.length) || 0),
        g: common_vendor.t(m.maxPlayers),
        h: m.screenshotDeadline
      }, m.screenshotDeadline ? {
        i: common_vendor.t($options.formatDeadline(m.screenshotDeadline))
      } : {}, {
        j: m.ownerId
      }, m.ownerId ? common_vendor.e({
        k: common_vendor.t($options.getPlayerName(m.ownerId)),
        l: (m.assistantIds || []).length > 0
      }, (m.assistantIds || []).length > 0 ? {
        m: common_vendor.t($options.formatAssistants(m))
      } : {}) : {}, {
        n: common_vendor.t($options.getUpcomingStatusText(m)),
        o: common_vendor.n($options.getUpcomingStatusClass(m)),
        p: m._id,
        q: common_vendor.o(($event) => $options.goDetail(m._id), m._id)
      });
    })
  } : {}, {
    g: $options.completed.length > 0
  }, $options.completed.length > 0 ? {
    h: common_vendor.f($options.completed, (m, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(m.title),
        b: $options.isNewMatch(m)
      }, $options.isNewMatch(m) ? {} : {}, {
        c: common_vendor.t(m.location || "待定"),
        d: common_vendor.t(m.date),
        e: common_vendor.t(m.time),
        f: common_vendor.t(m.ratingOpen ? "评分中" : "已完赛"),
        g: common_vendor.n(m.ratingOpen ? "status-rating" : "status-completed"),
        h: m.teamA.color || "#16a34a",
        i: common_vendor.t($options.getColorTeamName(m.teamA.color)),
        j: common_vendor.t(m.teamA.score),
        k: $options.getTeamAGoals(m).length > 0
      }, $options.getTeamAGoals(m).length > 0 ? {
        l: common_vendor.f($options.getTeamAGoals(m), (g, idx, i1) => {
          return common_vendor.e({
            a: common_vendor.t($options.getPlayerName(g.playerId)),
            b: g.isOwnGoal
          }, g.isOwnGoal ? {} : {}, {
            c: g.assistById
          }, g.assistById ? {
            d: common_vendor.t($options.getPlayerName(g.assistById))
          } : {}, {
            e: g.minute
          }, g.minute ? {
            f: common_vendor.t(g.minute)
          } : {}, {
            g: "a-" + idx
          });
        })
      } : {}, {
        m: common_vendor.t(m.teamB.score),
        n: common_vendor.t($options.getColorTeamName(m.teamB.color)),
        o: m.teamB.color || "#dc2626",
        p: $options.getTeamBGoals(m).length > 0
      }, $options.getTeamBGoals(m).length > 0 ? {
        q: common_vendor.f($options.getTeamBGoals(m), (g, idx, i1) => {
          return common_vendor.e({
            a: g.minute
          }, g.minute ? {
            b: common_vendor.t(g.minute)
          } : {}, {
            c: common_vendor.t($options.getPlayerName(g.playerId)),
            d: g.isOwnGoal
          }, g.isOwnGoal ? {} : {}, {
            e: g.assistById
          }, g.assistById ? {
            f: common_vendor.t($options.getPlayerName(g.assistById))
          } : {}, {
            g: "b-" + idx
          });
        })
      } : {}, {
        r: m.mvp && m.mvp.length > 0
      }, m.mvp && m.mvp.length > 0 ? {
        s: common_vendor.f(m.mvp, (mvpId, k1, i1) => {
          return {
            a: common_vendor.t($options.getPlayerName(mvpId)),
            b: mvpId
          };
        })
      } : {}, {
        t: m._id,
        v: common_vendor.o(($event) => $options.goDetail(m._id), m._id)
      });
    })
  } : {}, {
    i: $data.allMatches.length === 0
  }, $data.allMatches.length === 0 ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1cf27b2a"]]);
_sfc_main.__runtimeHooks = 2;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
