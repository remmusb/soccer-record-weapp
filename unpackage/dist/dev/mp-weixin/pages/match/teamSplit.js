"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
const _ = db.command;
const _sfc_main = {
  data() {
    return {
      matchId: "",
      match: { teamA: { players: [], score: 0 }, teamB: { players: [], score: 0 }, registrations: [] },
      players: {},
      isAdmin: false
    };
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadData();
    this.checkAdmin();
  },
  computed: {
    allRegistered() {
      if (!this.match)
        return [];
      return (this.match.registrations || []).filter((r) => r.status === "confirmed").map((r) => this.players[r.playerId]).filter(Boolean);
    },
    teamA() {
      var _a;
      if (!this.match)
        return [];
      return (((_a = this.match.teamA) == null ? void 0 : _a.players) || []).map((id) => this.players[id]).filter(Boolean);
    },
    teamB() {
      var _a;
      if (!this.match)
        return [];
      return (((_a = this.match.teamB) == null ? void 0 : _a.players) || []).map((id) => this.players[id]).filter(Boolean);
    },
    teamANames() {
      return this.teamA.map((p) => p.nickname);
    },
    teamBNames() {
      return this.teamB.map((p) => p.nickname);
    },
    unassigned() {
      var _a, _b, _c, _d;
      const assigned = /* @__PURE__ */ new Set([
        ...((_b = (_a = this.match) == null ? void 0 : _a.teamA) == null ? void 0 : _b.players) || [],
        ...((_d = (_c = this.match) == null ? void 0 : _c.teamB) == null ? void 0 : _d.players) || []
      ]);
      return this.allRegistered.filter((p) => !assigned.has(p._id));
    }
  },
  methods: {
    async checkAdmin() {
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "getAdmins" });
        const adminIds = result.admins || [];
        const { OPENID } = await common_vendor.wx$1.cloud.callFunction({ name: "login" }).then((r) => r.result);
        this.isAdmin = adminIds.includes(OPENID);
      } catch (e) {
        this.isAdmin = false;
      }
    },
    async loadData() {
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const { data } = await db.collection("matches").doc(this.matchId).get();
        this.match = data;
        const playerIds = [...new Set(data.registrations.map((r) => r.playerId))];
        if (playerIds.length > 0) {
          const { data: pList } = await db.collection("players").where({ _id: _.in(playerIds) }).get();
          pList.forEach((p) => {
            this.players[p._id] = p;
          });
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/teamSplit.vue:177", e);
      }
      common_vendor.wx$1.hideLoading();
    },
    avgRating(team) {
      if (team.length === 0)
        return 0;
      return team.reduce((s, p) => {
        var _a;
        return s + (((_a = p.stats) == null ? void 0 : _a.rating) || 5);
      }, 0) / team.length;
    },
    avgAge(team) {
      if (team.length === 0)
        return 0;
      return team.reduce((s, p) => s + this.calcAge(p), 0) / team.length;
    },
    calcAge(player) {
      if (!(player == null ? void 0 : player.birthDate))
        return 30;
      const birth = /* @__PURE__ */ new Date(player.birthDate + "-01");
      const now = /* @__PURE__ */ new Date();
      return now.getFullYear() - birth.getFullYear();
    },
    avgHeight(team) {
      if (team.length === 0)
        return 0;
      const heights = team.filter((p) => p.height).map((p) => parseFloat(p.height));
      if (heights.length === 0)
        return 0;
      return heights.reduce((s, h) => s + h, 0) / heights.length;
    },
    avgWeight(team) {
      if (team.length === 0)
        return 0;
      const weights = team.filter((p) => p.weight).map((p) => parseFloat(p.weight));
      if (weights.length === 0)
        return 0;
      return weights.reduce((s, w) => s + w, 0) / weights.length;
    },
    heightDiff(teamA, teamB) {
      return Math.abs(this.avgHeight(teamA) - this.avgHeight(teamB));
    },
    weightDiff(teamA, teamB) {
      return Math.abs(this.avgWeight(teamA) - this.avgWeight(teamB));
    },
    getPositionCategory(player) {
      const positions = (player == null ? void 0 : player.positions) || [];
      if (positions.includes("GK"))
        return "GK";
      const backPositions = ["CB", "LB", "RB", "CDM"];
      if (positions.some((p) => backPositions.includes(p)))
        return "BACK";
      const midPositions = ["CM", "CAM"];
      if (positions.some((p) => midPositions.includes(p)))
        return "MID";
      const frontPositions = ["LW", "RW", "ST", "CF"];
      if (positions.some((p) => frontPositions.includes(p)))
        return "FRONT";
      return "BACK";
    },
    countByPosition(team) {
      return {
        GK: team.filter((p) => this.getPositionCategory(p) === "GK").length,
        BACK: team.filter((p) => this.getPositionCategory(p) === "BACK").length,
        MID: team.filter((p) => this.getPositionCategory(p) === "MID").length,
        FRONT: team.filter((p) => this.getPositionCategory(p) === "FRONT").length
      };
    },
    positionScoreDiff(teamA, teamB) {
      const a = this.countByPosition(teamA);
      const b = this.countByPosition(teamB);
      let penalty = 0;
      penalty += Math.abs(a.GK - b.GK) * 3;
      penalty += Math.abs(a.BACK - b.BACK) * 1;
      penalty += Math.abs(a.MID - b.MID) * 1;
      penalty += Math.abs(a.FRONT - b.FRONT) * 1;
      return penalty;
    },
    async autoBalance() {
      var _a, _b, _c, _d;
      const players = this.allRegistered;
      if (players.length < 2) {
        common_vendor.index.showToast({ title: "人数不足", icon: "none" });
        return;
      }
      const sorted = [...players].sort((a, b) => {
        var _a2, _b2;
        return (((_a2 = b.stats) == null ? void 0 : _a2.rating) || 5) - (((_b2 = a.stats) == null ? void 0 : _b2.rating) || 5);
      });
      let teamA = [];
      let teamB = [];
      const gks = sorted.filter((p) => this.getPositionCategory(p) === "GK");
      const others = sorted.filter((p) => this.getPositionCategory(p) !== "GK");
      if (gks.length >= 2) {
        teamA.push(gks[0]);
        teamB.push(gks[1]);
      } else if (gks.length === 1) {
        teamA.push(gks[0]);
      }
      const remaining = others.concat(gks.length > 2 ? gks.slice(2) : []);
      for (const p of remaining) {
        const aRating = this.avgRating(teamA);
        const bRating = this.avgRating(teamB);
        const aCount = teamA.length;
        const bCount = teamB.length;
        this.avgHeight(teamA);
        this.avgHeight(teamB);
        this.avgWeight(teamA);
        this.avgWeight(teamB);
        if (aCount - bCount >= 2) {
          teamB.push(p);
          continue;
        }
        if (bCount - aCount >= 2) {
          teamA.push(p);
          continue;
        }
        const aScore = aRating * aCount + (((_a = p.stats) == null ? void 0 : _a.rating) || 5);
        const bScore = bRating * bCount + (((_b = p.stats) == null ? void 0 : _b.rating) || 5);
        aCount === 0 ? ((_c = p.stats) == null ? void 0 : _c.rating) || 5 : aScore / (aCount + 1);
        bCount === 0 ? ((_d = p.stats) == null ? void 0 : _d.rating) || 5 : bScore / (bCount + 1);
        const posA = this.positionScoreDiff([...teamA, p], teamB);
        const posB = this.positionScoreDiff(teamA, [...teamB, p]);
        const heightA = this.heightDiff([...teamA, p], teamB);
        const heightB = this.heightDiff(teamA, [...teamB, p]);
        const weightA = this.weightDiff([...teamA, p], teamB);
        const weightB = this.weightDiff(teamA, [...teamB, p]);
        let preferA = false;
        if (aRating <= bRating) {
          preferA = true;
        } else {
          preferA = false;
        }
        if (posA > posB + 2) {
          preferA = false;
        } else if (posB > posA + 2) {
          preferA = true;
        }
        if (heightA > heightB + 2) {
          preferA = false;
        } else if (heightB > heightA + 2) {
          preferA = true;
        }
        if (weightA > weightB + 3) {
          preferA = false;
        } else if (weightB > weightA + 3) {
          preferA = true;
        }
        const totalCount = teamA.length + teamB.length + 1;
        if (totalCount % 2 === 1) {
          if (aRating <= bRating && aCount <= bCount) {
            preferA = true;
          } else if (bRating < aRating && bCount <= aCount) {
            preferA = false;
          }
        }
        if (preferA) {
          teamA.push(p);
        } else {
          teamB.push(p);
        }
      }
      this.match.teamA = {
        ...this.match.teamA,
        players: teamA.map((p) => p._id),
        captainId: ""
      };
      this.match.teamB = {
        ...this.match.teamB,
        players: teamB.map((p) => p._id),
        captainId: ""
      };
      await this.saveTeams();
      common_vendor.index.showToast({ title: "已自动均衡" });
    },
    getFormation(team) {
      const rows = [];
      const gks = team.filter((p) => this.getPositionCategory(p) === "GK");
      const backs = team.filter((p) => this.getPositionCategory(p) === "BACK");
      const mids = team.filter((p) => this.getPositionCategory(p) === "MID");
      const fronts = team.filter((p) => this.getPositionCategory(p) === "FRONT");
      if (gks.length > 0)
        rows.push({ label: "门将", players: gks });
      if (backs.length > 0)
        rows.push({ label: "后场", players: backs });
      if (mids.length > 0)
        rows.push({ label: "中场", players: mids });
      if (fronts.length > 0)
        rows.push({ label: "前锋", players: fronts });
      return rows;
    },
    onCaptainAChange(e) {
      const idx = e.detail.value;
      this.match.teamA.captainId = this.teamA[idx]._id;
      this.match.teamA.captainIdx = idx;
    },
    onCaptainBChange(e) {
      const idx = e.detail.value;
      this.match.teamB.captainId = this.teamB[idx]._id;
      this.match.teamB.captainIdx = idx;
    },
    async clearTeams() {
      this.match.teamA = { ...this.match.teamA, players: [], captainId: "", captainIdx: -1 };
      this.match.teamB = { ...this.match.teamB, players: [], captainId: "", captainIdx: -1 };
      await this.saveTeams();
    },
    async moveToB(id) {
      this.match.teamA.players = this.match.teamA.players.filter((pid) => pid !== id);
      this.match.teamB.players.push(id);
      await this.saveTeams();
    },
    async moveToA(id) {
      this.match.teamB.players = this.match.teamB.players.filter((pid) => pid !== id);
      this.match.teamA.players.push(id);
      await this.saveTeams();
    },
    async assign(id, team) {
      this.match.teamA.players = this.match.teamA.players.filter((pid) => pid !== id);
      this.match.teamB.players = this.match.teamB.players.filter((pid) => pid !== id);
      if (team === "A")
        this.match.teamA.players.push(id);
      else
        this.match.teamB.players.push(id);
      await this.saveTeams();
    },
    async saveTeams() {
      await common_vendor.wx$1.cloud.callFunction({
        name: "updateMatch",
        data: { matchId: this.matchId, updateData: {
          "teamA.players": this.match.teamA.players,
          "teamB.players": this.match.teamB.players
        } }
      });
      this.loadData();
    },
    async save() {
      common_vendor.wx$1.showLoading({ title: "保存中" });
      try {
        await common_vendor.wx$1.cloud.callFunction({
          name: "updateMatch",
          data: { matchId: this.matchId, updateData: {
            "teamA.color": this.match.teamA.color || "",
            "teamB.color": this.match.teamB.color || "",
            "teamA.captainId": this.match.teamA.captainId || "",
            "teamB.captainId": this.match.teamB.captainId || "",
            "teamA.players": this.match.teamA.players || [],
            "teamB.players": this.match.teamB.players || []
          } }
        });
        if (this.isAdmin) {
          try {
            await common_vendor.wx$1.cloud.callFunction({
              name: "sendNotification",
              data: { type: "team_split", matchId: this.matchId }
            });
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/match/teamSplit.vue:450", "分队通知发送失败", e);
          }
        }
        common_vendor.index.showToast({ title: "分队已保存" });
        setTimeout(() => common_vendor.index.navigateBack(), 500);
      } catch (e) {
        common_vendor.index.showToast({ title: "保存失败", icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d, _e, _f;
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.autoBalance && $options.autoBalance(...args), "e4"),
    b: common_vendor.o((...args) => $options.clearTeams && $options.clearTeams(...args), "a1"),
    c: common_vendor.t(((_a = $data.match.teamA) == null ? void 0 : _a.name) || "A队"),
    d: $data.match.teamA.color,
    e: common_vendor.o(($event) => $data.match.teamA.color = $event.detail.value, "11"),
    f: common_vendor.t($data.match.teamA.captainId ? (_b = $options.teamA.find((p) => p._id === $data.match.teamA.captainId)) == null ? void 0 : _b.nickname : "选队长"),
    g: $options.teamANames,
    h: $data.match.teamA.captainIdx || -1,
    i: common_vendor.o((...args) => $options.onCaptainAChange && $options.onCaptainAChange(...args), "5b"),
    j: $options.teamA.length > 0
  }, $options.teamA.length > 0 ? {
    k: common_vendor.t($options.avgRating($options.teamA).toFixed(1)),
    l: common_vendor.t($options.avgAge($options.teamA).toFixed(0)),
    m: common_vendor.t($options.avgHeight($options.teamA).toFixed(0)),
    n: common_vendor.t($options.avgWeight($options.teamA).toFixed(0)),
    o: common_vendor.t($options.teamA.length)
  } : {}, {
    p: common_vendor.f($options.teamA, (p, k0, i0) => {
      return {
        a: common_vendor.t(p.nickname),
        b: common_vendor.o(($event) => $options.moveToB(p._id), p._id),
        c: p._id
      };
    }),
    q: common_vendor.t(((_c = $data.match.teamB) == null ? void 0 : _c.name) || "B队"),
    r: $data.match.teamB.color,
    s: common_vendor.o(($event) => $data.match.teamB.color = $event.detail.value, "18"),
    t: common_vendor.t($data.match.teamB.captainId ? (_d = $options.teamB.find((p) => p._id === $data.match.teamB.captainId)) == null ? void 0 : _d.nickname : "选队长"),
    v: $options.teamBNames,
    w: $data.match.teamB.captainIdx || -1,
    x: common_vendor.o((...args) => $options.onCaptainBChange && $options.onCaptainBChange(...args), "64"),
    y: $options.teamB.length > 0
  }, $options.teamB.length > 0 ? {
    z: common_vendor.t($options.avgRating($options.teamB).toFixed(1)),
    A: common_vendor.t($options.avgAge($options.teamB).toFixed(0)),
    B: common_vendor.t($options.avgHeight($options.teamB).toFixed(0)),
    C: common_vendor.t($options.avgWeight($options.teamB).toFixed(0)),
    D: common_vendor.t($options.teamB.length)
  } : {}, {
    E: common_vendor.f($options.teamB, (p, k0, i0) => {
      return {
        a: common_vendor.o(($event) => $options.moveToA(p._id), p._id),
        b: common_vendor.t(p.nickname),
        c: p._id
      };
    }),
    F: $options.teamA.length > 0 || $options.teamB.length > 0
  }, $options.teamA.length > 0 || $options.teamB.length > 0 ? common_vendor.e({
    G: $options.teamA.length > 0
  }, $options.teamA.length > 0 ? {
    H: common_vendor.t(((_e = $data.match.teamA) == null ? void 0 : _e.name) || "A队"),
    I: common_vendor.t($data.match.teamA.color || ""),
    J: common_vendor.f($options.getFormation($options.teamA), (row, idx, i0) => {
      return {
        a: common_vendor.t(row.label),
        b: common_vendor.f(row.players, (p, k1, i1) => {
          return common_vendor.e({
            a: p.avatar
          }, p.avatar ? {
            b: p.avatar
          } : {
            c: common_vendor.t(p.nickname[0])
          }, {
            d: common_vendor.t(p.nickname),
            e: p._id
          });
        }),
        c: idx
      };
    })
  } : {}, {
    K: $options.teamB.length > 0
  }, $options.teamB.length > 0 ? {
    L: common_vendor.t(((_f = $data.match.teamB) == null ? void 0 : _f.name) || "B队"),
    M: common_vendor.t($data.match.teamB.color || ""),
    N: common_vendor.f($options.getFormation($options.teamB), (row, idx, i0) => {
      return {
        a: common_vendor.t(row.label),
        b: common_vendor.f(row.players, (p, k1, i1) => {
          return common_vendor.e({
            a: p.avatar
          }, p.avatar ? {
            b: p.avatar
          } : {
            c: common_vendor.t(p.nickname[0])
          }, {
            d: common_vendor.t(p.nickname),
            e: p._id
          });
        }),
        c: idx
      };
    })
  } : {}) : {}, {
    O: $options.unassigned.length > 0
  }, $options.unassigned.length > 0 ? {
    P: common_vendor.f($options.unassigned, (p, k0, i0) => {
      return {
        a: common_vendor.t(p.nickname),
        b: common_vendor.o(($event) => $options.assign(p._id, "A"), p._id),
        c: common_vendor.o(($event) => $options.assign(p._id, "B"), p._id),
        d: p._id
      };
    })
  } : {}, {
    Q: common_vendor.o((...args) => $options.save && $options.save(...args), "19")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1bf21f64"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/match/teamSplit.js.map
