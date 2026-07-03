"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
const _sfc_main = {
  data() {
    return {
      players: [],
      completedMatches: []
    };
  },
  onShow() {
    this.loadData();
  },
  computed: {
    totalGoals() {
      return this.completedMatches.reduce((s, m) => {
        var _a, _b;
        return s + (((_a = m.teamA) == null ? void 0 : _a.score) || 0) + (((_b = m.teamB) == null ? void 0 : _b.score) || 0);
      }, 0);
    },
    topScorers() {
      return [...this.players].sort((a, b) => {
        var _a, _b;
        return (((_a = b.stats) == null ? void 0 : _a.goals) || 0) - (((_b = a.stats) == null ? void 0 : _b.goals) || 0);
      }).slice(0, 10);
    },
    topAssists() {
      return [...this.players].sort((a, b) => {
        var _a, _b;
        return (((_a = b.stats) == null ? void 0 : _a.assists) || 0) - (((_b = a.stats) == null ? void 0 : _b.assists) || 0);
      }).slice(0, 10);
    },
    topOwners() {
      return [...this.players].sort((a, b) => {
        var _a, _b;
        return (((_a = b.stats) == null ? void 0 : _a.ownerCount) || 0) - (((_b = a.stats) == null ? void 0 : _b.ownerCount) || 0);
      }).slice(0, 10);
    },
    topAssistants() {
      return [...this.players].sort((a, b) => {
        var _a, _b;
        return (((_a = b.stats) == null ? void 0 : _a.assistantCount) || 0) - (((_b = a.stats) == null ? void 0 : _b.assistantCount) || 0);
      }).slice(0, 10);
    },
    topRated() {
      return [...this.players].filter((p) => p.allowRating !== false).sort((a, b) => {
        var _a, _b;
        return (((_a = b.stats) == null ? void 0 : _a.rating) || 5) - (((_b = a.stats) == null ? void 0 : _b.rating) || 5);
      }).slice(0, 10);
    }
  },
  methods: {
    async loadData() {
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const playersRes = await db.collection("players").get();
        const matchesRes = await db.collection("matches").where({ status: "completed" }).get();
        this.players = playersRes.data;
        this.completedMatches = matchesRes.data;
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/stats/index.vue:121", "加载失败", e);
      }
      common_vendor.wx$1.hideLoading();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.completedMatches.length),
    b: common_vendor.t($options.totalGoals),
    c: common_vendor.f($options.topScorers, (p, i, i0) => {
      var _a, _b;
      return {
        a: common_vendor.t(i + 1),
        b: common_vendor.n(i < 3 ? "top" : ""),
        c: common_vendor.t(p.nickname[0]),
        d: common_vendor.t(p.nickname),
        e: common_vendor.t(((_a = p.stats) == null ? void 0 : _a.appearances) || 0),
        f: common_vendor.t(((_b = p.stats) == null ? void 0 : _b.goals) || 0),
        g: p._id
      };
    }),
    d: common_vendor.f($options.topAssists, (p, i, i0) => {
      var _a;
      return {
        a: common_vendor.t(i + 1),
        b: common_vendor.n(i < 3 ? "top" : ""),
        c: common_vendor.t(p.nickname[0]),
        d: common_vendor.t(p.nickname),
        e: common_vendor.t(((_a = p.stats) == null ? void 0 : _a.assists) || 0),
        f: p._id
      };
    }),
    e: common_vendor.f($options.topOwners, (p, i, i0) => {
      var _a;
      return {
        a: common_vendor.t(i + 1),
        b: common_vendor.n(i < 3 ? "top" : ""),
        c: common_vendor.t(p.nickname[0]),
        d: common_vendor.t(p.nickname),
        e: common_vendor.t(((_a = p.stats) == null ? void 0 : _a.ownerCount) || 0),
        f: p._id
      };
    }),
    f: common_vendor.f($options.topAssistants, (p, i, i0) => {
      var _a;
      return {
        a: common_vendor.t(i + 1),
        b: common_vendor.n(i < 3 ? "top" : ""),
        c: common_vendor.t(p.nickname[0]),
        d: common_vendor.t(p.nickname),
        e: common_vendor.t(((_a = p.stats) == null ? void 0 : _a.assistantCount) || 0),
        f: p._id
      };
    }),
    g: common_vendor.f($options.topRated, (p, i, i0) => {
      var _a;
      return {
        a: common_vendor.t(i + 1),
        b: common_vendor.n(i < 3 ? "top" : ""),
        c: common_vendor.t(p.nickname[0]),
        d: common_vendor.t(p.nickname),
        e: common_vendor.t(((_a = p.stats) == null ? void 0 : _a.rating) || 5),
        f: p._id
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1fa681a1"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/stats/index.js.map
