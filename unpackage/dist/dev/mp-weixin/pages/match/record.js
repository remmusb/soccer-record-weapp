"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
const _ = db.command;
const EVENT_TYPES = [
  { id: "goal", name: "进球", icon: "⚽" },
  { id: "assist", name: "助攻", icon: "🤝" },
  { id: "yellow", name: "黄牌", icon: "🟨" },
  { id: "red", name: "红牌", icon: "🟥" },
  { id: "own_goal", name: "乌龙", icon: "💥" },
  { id: "penalty", name: "点球", icon: "⭕" },
  { id: "sub_in", name: "替补上场", icon: "▶️" },
  { id: "sub_out", name: "替补下场", icon: "⏹️" }
];
const _sfc_main = {
  data() {
    return {
      matchId: "",
      match: null,
      players: {},
      allPlayers: [],
      selectedPlayerIdx: -1,
      selectedType: "goal",
      selectedAssistIdx: -1,
      eventMinute: "",
      EVENT_TYPES
    };
  },
  onLoad(options) {
    this.matchId = options.id;
    this.loadData();
  },
  computed: {
    teamAName() {
      var _a, _b;
      return ((_b = (_a = this.match) == null ? void 0 : _a.teamA) == null ? void 0 : _b.color) || "";
    },
    teamBName() {
      var _a, _b;
      return ((_b = (_a = this.match) == null ? void 0 : _a.teamB) == null ? void 0 : _b.color) || "";
    },
    allPlayerNames() {
      return this.allPlayers.map((p) => p.nickname);
    },
    assistPlayerNames() {
      const names = this.allPlayers.map((p) => p.nickname);
      return ["无助攻", ...names];
    },
    events() {
      var _a;
      return ((_a = this.match) == null ? void 0 : _a.events) || [];
    },
    sortedEvents() {
      return [...this.events].sort((a, b) => (a.minute || 0) - (b.minute || 0));
    }
  },
  methods: {
    async loadData() {
      var _a, _b;
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const { data } = await db.collection("matches").doc(this.matchId).get();
        this.match = data;
        const playerIds = [
          .../* @__PURE__ */ new Set([
            ...((_a = data.teamA) == null ? void 0 : _a.players) || [],
            ...((_b = data.teamB) == null ? void 0 : _b.players) || []
          ])
        ];
        if (playerIds.length > 0) {
          const { data: pList } = await db.collection("players").where({ _id: _.in(playerIds) }).get();
          this.allPlayers = pList;
          pList.forEach((p) => {
            this.players[p._id] = p;
          });
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/record.vue:165", "加载失败", e);
      }
      common_vendor.wx$1.hideLoading();
    },
    onPlayerChange(e) {
      this.selectedPlayerIdx = e.detail.value;
    },
    getPlayerName(id) {
      var _a;
      return ((_a = this.players[id]) == null ? void 0 : _a.nickname) || "未知";
    },
    eventIcon(type) {
      var _a;
      return ((_a = EVENT_TYPES.find((t) => t.id === type)) == null ? void 0 : _a.icon) || "";
    },
    eventTypeName(type) {
      var _a;
      return ((_a = EVENT_TYPES.find((t) => t.id === type)) == null ? void 0 : _a.name) || type;
    },
    addScore(team) {
      if (team === "A") {
        this.match.teamA.score = (this.match.teamA.score || 0) + 1;
      } else {
        this.match.teamB.score = (this.match.teamB.score || 0) + 1;
      }
    },
    minusScore(team) {
      if (team === "A") {
        this.match.teamA.score = Math.max(0, (this.match.teamA.score || 0) - 1);
      } else {
        this.match.teamB.score = Math.max(0, (this.match.teamB.score || 0) - 1);
      }
    },
    onAssistChange(e) {
      this.selectedAssistIdx = e.detail.value - 1;
    },
    addEvent() {
      if (this.selectedPlayerIdx < 0) {
        common_vendor.index.showToast({ title: "请选择球员", icon: "none" });
        return;
      }
      const player = this.allPlayers[this.selectedPlayerIdx];
      const minute = this.eventMinute ? parseInt(this.eventMinute) : null;
      const events = [...this.match.events || []];
      const baseId = Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const event = {
        id: baseId,
        playerId: player._id,
        type: this.selectedType,
        minute
      };
      events.push(event);
      if (this.selectedType === "goal" && this.selectedAssistIdx >= 0) {
        const assistPlayer = this.allPlayers[this.selectedAssistIdx];
        const assistEvent = {
          id: baseId + "_assist",
          playerId: assistPlayer._id,
          type: "assist",
          minute,
          assistById: player._id
          // 关联进球事件
        };
        events.push(assistEvent);
      }
      this.match.events = events;
      this.selectedPlayerIdx = -1;
      this.selectedAssistIdx = -1;
      this.eventMinute = "";
      common_vendor.index.showToast({ title: "已添加" });
    },
    removeEvent(idx) {
      const events = [...this.match.events];
      const removedEvent = events[idx];
      if (removedEvent.type === "goal") {
        const assistIdx = events.findIndex((e) => e.id === removedEvent.id + "_assist");
        if (assistIdx >= 0) {
          events.splice(assistIdx, 1);
          if (assistIdx < idx) {
            idx--;
          }
        }
      }
      if (removedEvent.type === "assist" && removedEvent.id.endsWith("_assist")) {
        const goalId = removedEvent.id.replace("_assist", "");
        const goalIdx = events.findIndex((e) => e.id === goalId);
        if (goalIdx >= 0) {
          events.splice(goalIdx, 1);
          if (goalIdx < idx) {
            idx--;
          }
        }
      }
      events.splice(idx, 1);
      this.match.events = events;
    },
    async saveAll() {
      common_vendor.wx$1.showLoading({ title: "保存中" });
      try {
        await db.collection("matches").doc(this.matchId).update({
          data: {
            "teamA.score": this.match.teamA.score,
            "teamB.score": this.match.teamB.score,
            events: this.match.events
          }
        });
        common_vendor.index.showToast({ title: "保存成功" });
        setTimeout(() => common_vendor.index.navigateBack(), 800);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/record.vue:281", "保存失败", e);
        common_vendor.index.showToast({ title: "保存失败", icon: "none" });
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
    d: common_vendor.t($data.match.time),
    e: common_vendor.t($options.teamAName),
    f: common_vendor.t($data.match.teamA.score),
    g: common_vendor.o(($event) => $options.addScore("A"), "e3"),
    h: common_vendor.o(($event) => $options.minusScore("A"), "9a"),
    i: common_vendor.t($options.teamBName),
    j: common_vendor.t($data.match.teamB.score),
    k: common_vendor.o(($event) => $options.addScore("B"), "87"),
    l: common_vendor.o(($event) => $options.minusScore("B"), "4c"),
    m: common_vendor.t($data.selectedPlayerIdx >= 0 ? $options.allPlayerNames[$data.selectedPlayerIdx] : "选择球员"),
    n: $options.allPlayerNames,
    o: $data.selectedPlayerIdx,
    p: common_vendor.o((...args) => $options.onPlayerChange && $options.onPlayerChange(...args), "89"),
    q: common_vendor.f($data.EVENT_TYPES, (t, k0, i0) => {
      return {
        a: common_vendor.t(t.icon),
        b: common_vendor.t(t.name),
        c: t.id,
        d: $data.selectedType === t.id ? 1 : "",
        e: common_vendor.o(($event) => $data.selectedType = t.id, t.id)
      };
    }),
    r: $data.selectedType === "goal"
  }, $data.selectedType === "goal" ? {
    s: common_vendor.t($data.selectedAssistIdx >= 0 ? $options.assistPlayerNames[$data.selectedAssistIdx] : "无助攻"),
    t: $options.assistPlayerNames,
    v: $data.selectedAssistIdx,
    w: common_vendor.o((...args) => $options.onAssistChange && $options.onAssistChange(...args), "e3")
  } : {}, {
    x: $data.eventMinute,
    y: common_vendor.o(($event) => $data.eventMinute = $event.detail.value, "8c"),
    z: common_vendor.o((...args) => $options.addEvent && $options.addEvent(...args), "4a"),
    A: $options.events.length > 0
  }, $options.events.length > 0 ? {
    B: common_vendor.f($options.sortedEvents, (e, i, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.eventIcon(e.type)),
        b: common_vendor.t($options.getPlayerName(e.playerId)),
        c: common_vendor.t($options.eventTypeName(e.type)),
        d: e.assistById
      }, e.assistById ? {
        e: common_vendor.t($options.getPlayerName(e.assistById))
      } : {}, {
        f: e.minute
      }, e.minute ? {
        g: common_vendor.t(e.minute)
      } : {}, {
        h: common_vendor.o(($event) => $options.removeEvent(i), i),
        i
      });
    })
  } : {}, {
    C: common_vendor.o((...args) => $options.saveAll && $options.saveAll(...args), "af")
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e57fd031"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/match/record.js.map
