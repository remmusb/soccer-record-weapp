"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
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
      playerId: "",
      player: null,
      matches: [],
      ownerMatches: [],
      assistantMatches: [],
      ratingHistory: [],
      registeredMatches: [],
      confirmedMatches: [],
      timeFilter: "all",
      allMatchesData: [],
      isAdmin: false
    };
  },
  onLoad(options) {
    this.playerId = options.id;
    this.loadData();
  },
  computed: {
    filterLabel() {
      return { all: "全部", year: "本年度", month: "本月" }[this.timeFilter];
    },
    filteredMatches() {
      if (!this.matches.length)
        return [];
      const now = /* @__PURE__ */ new Date();
      return this.matches.filter((m) => {
        if (this.timeFilter === "all")
          return true;
        const d = new Date(m.date);
        if (this.timeFilter === "year")
          return d.getFullYear() === now.getFullYear();
        if (this.timeFilter === "month")
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        return true;
      });
    },
    filteredStats() {
      var _a, _b;
      const matches = this.filteredMatches;
      let appearances = 0, goals = 0, assists = 0, wins = 0, draws = 0, losses = 0;
      let yellowCards = 0, redCards = 0, ownGoals = 0, ownerCount = 0, assistantCount = 0;
      for (const m of matches) {
        appearances++;
        const inA = (_b = (_a = m.teamA) == null ? void 0 : _a.players) == null ? void 0 : _b.includes(this.playerId);
        const aWin = m.teamA.score > m.teamB.score;
        const bWin = m.teamB.score > m.teamA.score;
        const draw = m.teamA.score === m.teamB.score;
        if (inA) {
          if (aWin)
            wins++;
          else if (draw)
            draws++;
          else
            losses++;
        } else {
          if (bWin)
            wins++;
          else if (draw)
            draws++;
          else
            losses++;
        }
        for (const e of m.events || []) {
          if (e.playerId !== this.playerId)
            continue;
          if (e.type === "goal")
            goals++;
          if (e.type === "assist")
            assists++;
          if (e.type === "yellow")
            yellowCards++;
          if (e.type === "red")
            redCards++;
          if (e.type === "own_goal")
            ownGoals++;
        }
      }
      const ownerFiltered = this.filteredOwnerMatches;
      const assistantFiltered = this.filteredAssistantMatches;
      ownerCount = ownerFiltered.length;
      assistantCount = assistantFiltered.length;
      return { appearances, goals, assists, wins, draws, losses, yellowCards, redCards, ownGoals, ownerCount, assistantCount };
    },
    filteredOwnerMatches() {
      return this.filterByTime(this.ownerMatches);
    },
    filteredAssistantMatches() {
      return this.filterByTime(this.assistantMatches);
    },
    filteredRatingHistory() {
      const matchIds = new Set(this.filteredMatches.map((m) => m._id));
      return this.ratingHistory.filter((r) => matchIds.has(r.matchId));
    }
  },
  methods: {
    filterByTime(list) {
      if (!list.length)
        return [];
      const now = /* @__PURE__ */ new Date();
      return list.filter((m) => {
        if (this.timeFilter === "all")
          return true;
        const d = new Date(m.date);
        if (this.timeFilter === "year")
          return d.getFullYear() === now.getFullYear();
        if (this.timeFilter === "month")
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        return true;
      });
    },
    async loadData() {
      var _a, _b, _c, _d, _e, _f;
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const { result: loginRes } = await common_vendor.wx$1.cloud.callFunction({ name: "login" });
        this.isAdmin = loginRes.isAdmin || false;
        const { data } = await db.collection("players").doc(this.playerId).get();
        this.player = data;
        const { data: allMatches } = await db.collection("matches").where({ "registrations.playerId": this.playerId }).orderBy("date", "desc").get();
        const registered = [];
        const confirmed = [];
        for (const m of allMatches) {
          const reg = m.registrations.find((r) => r.playerId === this.playerId);
          if (!reg)
            continue;
          const enriched = { ...m, _regStatus: reg.status };
          if (reg.status === "WL" || reg.status === "pending_screenshot") {
            registered.push(enriched);
          } else if (reg.status === "confirmed") {
            const inA = (_b = (_a = m.teamA) == null ? void 0 : _a.players) == null ? void 0 : _b.includes(this.playerId);
            const inB = (_d = (_c = m.teamB) == null ? void 0 : _c.players) == null ? void 0 : _d.includes(this.playerId);
            if (inA)
              enriched._teamColor = ((_e = m.teamA) == null ? void 0 : _e.color) || "";
            if (inB)
              enriched._teamColor = ((_f = m.teamB) == null ? void 0 : _f.color) || "";
            confirmed.push(enriched);
          }
        }
        this.registeredMatches = registered;
        this.confirmedMatches = confirmed;
        const completed = allMatches.filter((m) => m.status === "completed");
        this.matches = completed;
        const { result: roleRes } = await common_vendor.wx$1.cloud.callFunction({
          name: "getPlayerMatches",
          data: { playerId: this.playerId }
        });
        this.ownerMatches = roleRes.ownerMatches || [];
        this.assistantMatches = roleRes.assistantMatches || [];
        const ratings = data.ratings || {};
        const peerRatings = ratings.peerRatings || [];
        const adminRatings = ratings.adminRatings || [];
        const allMatchIds = /* @__PURE__ */ new Set([
          ...peerRatings.map((r) => r.matchId),
          ...adminRatings.map((r) => r.matchId)
        ]);
        const matchMap = {};
        for (const m of completed)
          matchMap[m._id] = m;
        this.ratingHistory = [...allMatchIds].map((mid) => {
          const peer = peerRatings.find((r) => r.matchId === mid);
          const admin = adminRatings.find((r) => r.matchId === mid);
          const match = matchMap[mid];
          return {
            matchId: mid,
            matchTitle: (match == null ? void 0 : match.title) || mid,
            peerScore: (peer == null ? void 0 : peer.score) || 0,
            adminScore: (admin == null ? void 0 : admin.score) || 0,
            performanceScore: 0
          };
        }).sort((a, b) => {
          const ma = matchMap[a.matchId], mb = matchMap[b.matchId];
          if (!ma || !mb)
            return 0;
          return /* @__PURE__ */ new Date(mb.date + "T" + mb.time) - /* @__PURE__ */ new Date(ma.date + "T" + ma.time);
        });
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/detail.vue:328", "加载失败", e);
      }
      common_vendor.wx$1.hideLoading();
    },
    getPositions(p) {
      if (!(p == null ? void 0 : p.positions))
        return "";
      return p.positions.map((pos) => {
        var _a;
        return ((_a = POSITIONS.find((pt) => pt.id === pos)) == null ? void 0 : _a.name) || pos;
      }).join(" · ");
    },
    getResult(m) {
      var _a, _b;
      const inA = (_b = (_a = m.teamA) == null ? void 0 : _a.players) == null ? void 0 : _b.includes(this.playerId);
      const aWin = m.teamA.score > m.teamB.score;
      const bWin = m.teamB.score > m.teamA.score;
      const draw = m.teamA.score === m.teamB.score;
      if (inA)
        return aWin ? "胜" : draw ? "平" : "负";
      return bWin ? "胜" : draw ? "平" : "负";
    },
    getResultClass(m) {
      const r = this.getResult(m);
      return r === "胜" ? "win" : r === "负" ? "loss" : "draw";
    },
    // ===== 管理员操作 =====
    async editInitialRating() {
      var _a;
      const current = ((_a = this.player.ratings) == null ? void 0 : _a.initialRating) || 5;
      common_vendor.index.showModal({
        title: "修改初始评分",
        content: `当前初始评分：${current}
请输入新的初始评分（1-10）：`,
        editable: true,
        placeholderText: "1-10",
        success: async (res) => {
          if (res.confirm && res.content) {
            const newRating = parseInt(res.content.trim());
            if (isNaN(newRating) || newRating < 1 || newRating > 10) {
              common_vendor.index.showToast({ title: "请输入1-10的整数", icon: "none" });
              return;
            }
            common_vendor.wx$1.showLoading({ title: "保存中" });
            try {
              const db2 = common_vendor.wx$1.cloud.database();
              await db2.collection("players").doc(this.playerId).update({
                data: {
                  "ratings.initialRating": newRating
                }
              });
              this.player.ratings = { ...this.player.ratings, initialRating: newRating };
              common_vendor.index.showToast({ title: "已修改" });
            } catch (e) {
              common_vendor.index.showToast({ title: "保存失败", icon: "none" });
            }
            common_vendor.wx$1.hideLoading();
          }
        }
      });
    },
    async editAllowRating() {
      const current = this.player.allowRating !== false;
      common_vendor.index.showActionSheet({
        itemList: ["✅ 允许队友评分", "🚫 不接受评分"],
        success: async (res) => {
          const newVal = res.tapIndex === 0;
          if (newVal === current)
            return;
          common_vendor.wx$1.showLoading({ title: "保存中" });
          try {
            const db2 = common_vendor.wx$1.cloud.database();
            await db2.collection("players").doc(this.playerId).update({
              data: { allowRating: newVal }
            });
            this.player.allowRating = newVal;
            common_vendor.index.showToast({ title: "已修改" });
          } catch (e) {
            common_vendor.index.showToast({ title: "保存失败", icon: "none" });
          }
          common_vendor.wx$1.hideLoading();
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d, _e;
  return common_vendor.e({
    a: $data.player
  }, $data.player ? common_vendor.e({
    b: $data.player.avatar
  }, $data.player.avatar ? {
    c: $data.player.avatar
  } : {
    d: common_vendor.t($data.player.nickname[0])
  }, {
    e: common_vendor.t($data.player.nickname),
    f: $data.player.allowRating === false
  }, $data.player.allowRating === false ? {} : {}, {
    g: common_vendor.t($data.player.name),
    h: common_vendor.t($options.getPositions($data.player)),
    i: $data.player.birthDate
  }, $data.player.birthDate ? {
    j: common_vendor.t($data.player.birthDate)
  } : {}, {
    k: $data.player.kttLast4
  }, $data.player.kttLast4 ? {
    l: common_vendor.t($data.player.kttLast4)
  } : {}, {
    m: $data.registeredMatches.length > 0 || $data.confirmedMatches.length > 0
  }, $data.registeredMatches.length > 0 || $data.confirmedMatches.length > 0 ? common_vendor.e({
    n: $data.registeredMatches.length > 0
  }, $data.registeredMatches.length > 0 ? {
    o: common_vendor.f($data.registeredMatches, (m, k0, i0) => {
      return {
        a: common_vendor.t(m.title),
        b: common_vendor.t(m.date),
        c: common_vendor.t(m.time),
        d: common_vendor.t(m.location || "待定"),
        e: common_vendor.t(m._regStatus === "WL" ? "候补" : "待截图"),
        f: common_vendor.n(m._regStatus),
        g: m._id
      };
    })
  } : {}, {
    p: $data.confirmedMatches.length > 0
  }, $data.confirmedMatches.length > 0 ? {
    q: common_vendor.f($data.confirmedMatches, (m, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(m.title),
        b: common_vendor.t(m.date),
        c: common_vendor.t(m.time),
        d: common_vendor.t(m.location || "待定"),
        e: m._teamColor
      }, m._teamColor ? {
        f: common_vendor.t(m._teamColor)
      } : {}, {
        g: m._id
      });
    })
  } : {}) : {}, {
    r: common_vendor.t(((_a = $data.player.stats) == null ? void 0 : _a.rating) || 5),
    s: (((_b = $data.player.stats) == null ? void 0 : _b.rating) || 5) * 10 + "%",
    t: common_vendor.t(((_c = $data.player.stats) == null ? void 0 : _c.peerAvg) || 5),
    v: common_vendor.t(((_d = $data.player.stats) == null ? void 0 : _d.adminAvg) || 5),
    w: common_vendor.t(((_e = $data.player.stats) == null ? void 0 : _e.performanceRating) || 5),
    x: $data.isAdmin
  }, $data.isAdmin ? {
    y: common_vendor.o((...args) => $options.editInitialRating && $options.editInitialRating(...args), "40"),
    z: common_vendor.o((...args) => $options.editAllowRating && $options.editAllowRating(...args), "5f")
  } : {}, {
    A: $data.timeFilter === "all" ? 1 : "",
    B: common_vendor.o(($event) => $data.timeFilter = "all", "94"),
    C: $data.timeFilter === "year" ? 1 : "",
    D: common_vendor.o(($event) => $data.timeFilter = "year", "17"),
    E: $data.timeFilter === "month" ? 1 : "",
    F: common_vendor.o(($event) => $data.timeFilter = "month", "20"),
    G: common_vendor.t($options.filteredStats.appearances || 0),
    H: common_vendor.t($options.filteredStats.goals || 0),
    I: common_vendor.t($options.filteredStats.assists || 0),
    J: common_vendor.t($options.filteredStats.wins || 0),
    K: common_vendor.t($options.filteredStats.draws || 0),
    L: common_vendor.t($options.filteredStats.losses || 0),
    M: common_vendor.t($options.filteredStats.ownerCount || 0),
    N: common_vendor.t($options.filteredStats.assistantCount || 0),
    O: common_vendor.t($options.filteredStats.redCards || 0),
    P: $options.filteredRatingHistory.length > 0
  }, $options.filteredRatingHistory.length > 0 ? {
    Q: common_vendor.f($options.filteredRatingHistory, (r, k0, i0) => {
      return {
        a: common_vendor.t(r.matchTitle),
        b: common_vendor.t(r.peerScore || "-"),
        c: r.peerScore > 0 ? 1 : "",
        d: common_vendor.t(r.adminScore || "-"),
        e: r.adminScore > 0 ? 1 : "",
        f: common_vendor.t(r.performanceScore),
        g: r.matchId
      };
    })
  } : {}, {
    R: $options.filteredOwnerMatches.length > 0 || $options.filteredAssistantMatches.length > 0
  }, $options.filteredOwnerMatches.length > 0 || $options.filteredAssistantMatches.length > 0 ? common_vendor.e({
    S: $options.filteredOwnerMatches.length > 0
  }, $options.filteredOwnerMatches.length > 0 ? {
    T: common_vendor.f($options.filteredOwnerMatches, (m, k0, i0) => {
      return {
        a: common_vendor.t(m.title),
        b: common_vendor.t(m.date),
        c: common_vendor.t(m.time),
        d: m._id
      };
    })
  } : {}, {
    U: $options.filteredAssistantMatches.length > 0
  }, $options.filteredAssistantMatches.length > 0 ? {
    V: common_vendor.f($options.filteredAssistantMatches, (m, k0, i0) => {
      return {
        a: common_vendor.t(m.title),
        b: common_vendor.t(m.date),
        c: common_vendor.t(m.time),
        d: m._id
      };
    })
  } : {}) : {}, {
    W: $options.filteredMatches.length === 0
  }, $options.filteredMatches.length === 0 ? {
    X: common_vendor.t($options.filterLabel)
  } : {}, {
    Y: common_vendor.f($options.filteredMatches, (m, k0, i0) => {
      return {
        a: common_vendor.t(m.title),
        b: common_vendor.t(m.date),
        c: common_vendor.t(m.time),
        d: common_vendor.t(m.location || "待定"),
        e: common_vendor.t($options.getResult(m)),
        f: common_vendor.n($options.getResultClass(m)),
        g: m._id
      };
    })
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-990dd1c5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/players/detail.js.map
