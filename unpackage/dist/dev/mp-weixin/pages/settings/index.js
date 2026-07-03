"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      players: [],
      admins: [],
      selectedIndex: -1,
      adding: false,
      isAdmin: false,
      debugResult: null
    };
  },
  computed: {
    playerNames() {
      return this.players.map((p) => p.nickname);
    }
  },
  onShow() {
    this.loadData();
  },
  methods: {
    async loadData() {
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const [pRes, aRes, loginRes] = await Promise.all([
          common_vendor.wx$1.cloud.callFunction({ name: "getPlayers" }),
          common_vendor.wx$1.cloud.callFunction({ name: "getAdmins" }),
          common_vendor.wx$1.cloud.callFunction({ name: "login" })
        ]);
        this.players = pRes.result.players || [];
        this.isAdmin = loginRes.result.isAdmin || false;
        const adminsData = aRes.result.admins || [];
        this.admins = adminsData.map((a) => {
          const player = this.players.find((p) => p._id === a.playerId);
          return { ...a, nickname: (player == null ? void 0 : player.nickname) || "未知", name: (player == null ? void 0 : player.name) || "" };
        });
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/settings/index.vue:100", "加载失败", e);
        common_vendor.index.showToast({ title: "加载失败: " + (e.message || ""), icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    },
    onPlayerChange(e) {
      this.selectedIndex = e.detail.value;
    },
    async addAdmin() {
      if (this.selectedIndex < 0)
        return;
      const player = this.players[this.selectedIndex];
      if (this.admins.some((a) => a.playerId === player._id)) {
        common_vendor.index.showToast({ title: "该球员已是管理员", icon: "none" });
        return;
      }
      this.adding = true;
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({
          name: "addAdmin",
          data: { playerId: player._id }
        });
        if (result.success) {
          common_vendor.index.showToast({ title: "添加成功" });
          this.selectedIndex = -1;
          this.loadData();
        } else {
          common_vendor.index.showToast({ title: result.error || "添加失败", icon: "none" });
        }
      } catch (e) {
        common_vendor.index.showToast({ title: "添加失败", icon: "none" });
      }
      this.adding = false;
    },
    async removeAdmin(id) {
      common_vendor.index.showModal({
        title: "确认移除",
        content: "移除该管理员？",
        success: async (res) => {
          if (res.confirm) {
            try {
              const { result } = await common_vendor.wx$1.cloud.callFunction({
                name: "removeAdmin",
                data: { adminId: id }
              });
              if (result.success) {
                common_vendor.index.showToast({ title: "已移除" });
                this.loadData();
              } else {
                common_vendor.index.showToast({ title: result.error || "移除失败", icon: "none" });
              }
            } catch (e) {
              common_vendor.index.showToast({ title: "移除失败", icon: "none" });
            }
          }
        }
      });
    },
    async recalculate() {
      common_vendor.wx$1.showLoading({ title: "计算中" });
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "recalculateStats" });
        this.debugResult = result;
        if (result.success) {
          common_vendor.index.showToast({ title: "已更新 " + result.updated + " 人" });
        } else {
          common_vendor.index.showToast({ title: result.error || "计算失败", icon: "none" });
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/settings/index.vue:169", e);
        this.debugResult = { success: false, error: e.message || "调用失败" };
        common_vendor.index.showToast({ title: "计算失败", icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    },
    async exportData() {
      common_vendor.wx$1.showLoading({ title: "导出中" });
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "exportData" });
        common_vendor.index.__f__("log", "at pages/settings/index.vue:179", "players:", result.players);
        common_vendor.index.__f__("log", "at pages/settings/index.vue:180", "matches:", result.matches);
        common_vendor.index.showToast({ title: "数据已输出到控制台" });
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/settings/index.vue:183", e);
        common_vendor.index.showToast({ title: "导出失败", icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    },
    clearData() {
      common_vendor.index.showModal({
        title: "确认清空",
        content: "此操作不可恢复，确定清空所有数据？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showToast({ title: "请在云控制台清空", icon: "none" });
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.isAdmin
  }, $data.isAdmin ? common_vendor.e({
    b: common_vendor.o((...args) => $options.recalculate && $options.recalculate(...args), "f1"),
    c: $data.debugResult
  }, $data.debugResult ? common_vendor.e({
    d: common_vendor.t($data.debugResult.success ? "计算成功" : "计算失败"),
    e: common_vendor.n($data.debugResult.success ? "success" : "fail"),
    f: $data.debugResult.success
  }, $data.debugResult.success ? {
    g: common_vendor.f($data.debugResult.results, (r, k0, i0) => {
      return {
        a: common_vendor.t(r.nickname),
        b: common_vendor.t(r.initialRating),
        c: common_vendor.t(r.compositeRating),
        d: common_vendor.t(r.peerAvg),
        e: common_vendor.t(r.adminAvg),
        f: common_vendor.t(r.performanceRating),
        g: r.playerId
      };
    })
  } : {
    h: common_vendor.t($data.debugResult.error)
  }) : {}) : {}, {
    i: common_vendor.f($data.admins, (a, k0, i0) => {
      var _a;
      return {
        a: common_vendor.t(((_a = a.nickname) == null ? void 0 : _a[0]) || "?"),
        b: common_vendor.t(a.nickname),
        c: common_vendor.t(a.name),
        d: common_vendor.o(($event) => $options.removeAdmin(a._id), a._id),
        e: a._id
      };
    }),
    j: $data.admins.length === 0
  }, $data.admins.length === 0 ? {} : {}, {
    k: common_vendor.t($data.selectedIndex >= 0 ? $options.playerNames[$data.selectedIndex] : "选择球员"),
    l: $data.selectedIndex < 0 ? 1 : "",
    m: $options.playerNames,
    n: $data.selectedIndex,
    o: common_vendor.o((...args) => $options.onPlayerChange && $options.onPlayerChange(...args), "b9"),
    p: $data.adding || $data.selectedIndex < 0 ? 1 : "",
    q: common_vendor.o((...args) => $options.addAdmin && $options.addAdmin(...args), "29"),
    r: common_vendor.o((...args) => $options.exportData && $options.exportData(...args), "21"),
    s: common_vendor.o((...args) => $options.clearData && $options.clearData(...args), "b8")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-a11b3e9a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/settings/index.js.map
