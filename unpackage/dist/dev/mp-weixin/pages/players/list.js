"use strict";
const common_vendor = require("../../common/vendor.js");
common_vendor.wx$1.cloud.database();
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
    return { players: [], isAdmin: false, sortBy: "rating" };
  },
  computed: {
    totalAppearances() {
      return this.players.reduce((sum, p) => {
        var _a;
        return sum + (((_a = p.stats) == null ? void 0 : _a.appearances) || 0);
      }, 0);
    },
    totalGoals() {
      return this.players.reduce((sum, p) => {
        var _a;
        return sum + (((_a = p.stats) == null ? void 0 : _a.goals) || 0);
      }, 0);
    },
    totalAssists() {
      return this.players.reduce((sum, p) => {
        var _a;
        return sum + (((_a = p.stats) == null ? void 0 : _a.assists) || 0);
      }, 0);
    },
    totalMVP() {
      return this.players.reduce((sum, p) => {
        var _a;
        return sum + (((_a = p.stats) == null ? void 0 : _a.mvp) || 0);
      }, 0);
    }
  },
  onShow() {
    this.loadPlayers();
  },
  methods: {
    changeSort(field) {
      this.sortBy = field;
      this.sortPlayers();
    },
    sortPlayers() {
      const sortMap = {
        rating: (a, b) => {
          var _a, _b;
          return (((_a = b.stats) == null ? void 0 : _a.rating) || 5) - (((_b = a.stats) == null ? void 0 : _b.rating) || 5);
        },
        mvp: (a, b) => {
          var _a, _b;
          return (((_a = b.stats) == null ? void 0 : _a.mvp) || 0) - (((_b = a.stats) == null ? void 0 : _b.mvp) || 0);
        },
        appearances: (a, b) => {
          var _a, _b;
          return (((_a = b.stats) == null ? void 0 : _a.appearances) || 0) - (((_b = a.stats) == null ? void 0 : _b.appearances) || 0);
        },
        goals: (a, b) => {
          var _a, _b;
          return (((_a = b.stats) == null ? void 0 : _a.goals) || 0) - (((_b = a.stats) == null ? void 0 : _b.goals) || 0);
        },
        assists: (a, b) => {
          var _a, _b;
          return (((_a = b.stats) == null ? void 0 : _a.assists) || 0) - (((_b = a.stats) == null ? void 0 : _b.assists) || 0);
        }
      };
      this.players.sort(sortMap[this.sortBy] || sortMap.rating);
    },
    async loadPlayers() {
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "login" });
        this.isAdmin = result.isAdmin || false;
        const { result: playerResult } = await common_vendor.wx$1.cloud.callFunction({ name: "getPlayers" });
        this.players = playerResult.players || [];
        this.sortPlayers();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/list.vue:124", "加载球员失败", e);
        common_vendor.index.showToast({ title: "加载失败：" + (e.message || "请检查数据库权限"), icon: "none", duration: 3e3 });
      }
      common_vendor.wx$1.hideLoading();
    },
    getPositions(p) {
      if (!p.positions)
        return "";
      return p.positions.map((pos) => {
        var _a;
        return ((_a = POSITIONS.find((pt) => pt.id === pos)) == null ? void 0 : _a.name) || pos;
      }).join(" · ");
    },
    getHistoricalRating(p) {
      if (!p.ratings)
        return null;
      const peerScores = (p.ratings.peerRatings || []).map((r) => r.score);
      const adminScores = (p.ratings.adminRatings || []).map((r) => r.score);
      const allScores = [...peerScores, ...adminScores];
      if (allScores.length === 0)
        return null;
      return (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
    },
    goCreate() {
      common_vendor.index.navigateTo({ url: "/pages/players/create" });
    },
    goDetail(id) {
      common_vendor.index.navigateTo({ url: `/pages/players/detail?id=${id}` });
    },
    deletePlayer(playerId) {
      common_vendor.index.showModal({
        title: "确认删除",
        content: "删除后不可恢复，确定删除该球员？",
        confirmColor: "#dc2626",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.wx$1.showLoading({ title: "删除中" });
            try {
              const { result } = await common_vendor.wx$1.cloud.callFunction({
                name: "deletePlayer",
                data: { playerId }
              });
              if (result.success) {
                common_vendor.index.showToast({ title: "已删除" });
                this.loadPlayers();
              } else {
                common_vendor.index.showToast({ title: result.error || "删除失败", icon: "none" });
              }
            } catch (e) {
              common_vendor.index.__f__("error", "at pages/players/list.vue:163", "删除失败", e);
              common_vendor.index.showToast({ title: "删除失败", icon: "none" });
            }
            common_vendor.wx$1.hideLoading();
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.players.length),
    b: common_vendor.t($options.totalAppearances),
    c: common_vendor.t($options.totalGoals),
    d: common_vendor.t($options.totalAssists),
    e: common_vendor.t($options.totalMVP),
    f: $data.sortBy === "rating" ? 1 : "",
    g: common_vendor.o(($event) => $options.changeSort("rating"), "b5"),
    h: $data.sortBy === "mvp" ? 1 : "",
    i: common_vendor.o(($event) => $options.changeSort("mvp"), "fa"),
    j: $data.sortBy === "appearances" ? 1 : "",
    k: common_vendor.o(($event) => $options.changeSort("appearances"), "3b"),
    l: $data.sortBy === "goals" ? 1 : "",
    m: common_vendor.o(($event) => $options.changeSort("goals"), "b0"),
    n: $data.sortBy === "assists" ? 1 : "",
    o: common_vendor.o(($event) => $options.changeSort("assists"), "eb"),
    p: common_vendor.o((...args) => $options.goCreate && $options.goCreate(...args), "15"),
    q: common_vendor.f($data.players, (p, k0, i0) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
      return common_vendor.e({
        a: p.avatar
      }, p.avatar ? {
        b: p.avatar
      } : {
        c: common_vendor.t(p.nickname[0])
      }, {
        d: common_vendor.t(p.nickname),
        e: ((_a = p.stats) == null ? void 0 : _a.ownerCount) > 0
      }, ((_b = p.stats) == null ? void 0 : _b.ownerCount) > 0 ? {
        f: common_vendor.t(p.stats.ownerCount)
      } : {}, {
        g: ((_c = p.stats) == null ? void 0 : _c.assistantCount) > 0
      }, ((_d = p.stats) == null ? void 0 : _d.assistantCount) > 0 ? {
        h: common_vendor.t(p.stats.assistantCount)
      } : {}, {
        i: ((_e = p.stats) == null ? void 0 : _e.mvp) > 0
      }, ((_f = p.stats) == null ? void 0 : _f.mvp) > 0 ? {
        j: common_vendor.t(p.stats.mvp)
      } : {}, {
        k: common_vendor.t($options.getPositions(p)),
        l: common_vendor.t(((_g = p.stats) == null ? void 0 : _g.appearances) || 0),
        m: common_vendor.t(((_h = p.stats) == null ? void 0 : _h.goals) || 0),
        n: common_vendor.t(((_i = p.stats) == null ? void 0 : _i.assists) || 0),
        o: (_j = p.stats) == null ? void 0 : _j.yellowCards
      }, ((_k = p.stats) == null ? void 0 : _k.yellowCards) ? {
        p: common_vendor.t(p.stats.yellowCards)
      } : {}, {
        q: (_l = p.stats) == null ? void 0 : _l.redCards
      }, ((_m = p.stats) == null ? void 0 : _m.redCards) ? {
        r: common_vendor.t(p.stats.redCards)
      } : {}, {
        s: (_n = p.stats) == null ? void 0 : _n.mvp
      }, ((_o = p.stats) == null ? void 0 : _o.mvp) ? {
        t: common_vendor.t(p.stats.mvp)
      } : {}, {
        v: common_vendor.t(((_p = p.stats) == null ? void 0 : _p.appearances) || 0)
      }, $data.isAdmin ? {
        w: common_vendor.o(($event) => $options.deletePlayer(p._id), p._id)
      } : {}, {
        x: p._id,
        y: common_vendor.o(($event) => $options.goDetail(p._id), p._id)
      });
    }),
    r: $data.isAdmin,
    s: $data.players.length === 0
  }, $data.players.length === 0 ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1c88c4a5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/players/list.js.map
