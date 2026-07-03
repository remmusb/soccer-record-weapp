"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
const _sfc_main = {
  data() {
    return {
      form: {
        title: "",
        date: "",
        time: "20:00",
        endTime: "",
        location: "",
        latitude: null,
        longitude: null,
        maxPlayers: 14,
        notes: "",
        needScreenshot: true,
        screenshotDeadline: "",
        teamAName: "蓝队",
        teamBName: "白队",
        ownerId: "",
        assistantIds: []
      },
      playersList: [],
      playersMap: {},
      showDeadlinePicker: false,
      editMode: false,
      editMatchId: "",
      isAdmin: false
    };
  },
  onLoad(options) {
    this.checkAdmin().then(() => {
      if (!this.isAdmin && !options.edit) {
        common_vendor.index.showModal({
          title: "无权限",
          content: "仅管理员可创建场次",
          showCancel: false,
          success: () => common_vendor.index.navigateBack()
        });
        return;
      }
      this.loadPlayersList();
      if (options.id && options.edit) {
        this.editMode = true;
        this.editMatchId = options.id;
        this.loadMatchData();
      } else {
        this.initDate();
        this.calcEndTime();
      }
    });
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
    async loadPlayersList() {
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "getPlayers" });
        this.playersList = (result.players || []).filter((p) => p && p._id);
        this.playersMap = {};
        this.playersList.forEach((p) => {
          this.playersMap[p._id] = p;
        });
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/create.vue:219", "加载球员列表失败", e);
      }
    },
    async loadMatchData() {
      var _a, _b;
      common_vendor.wx$1.showLoading({ title: "加载中" });
      try {
        const { data } = await db.collection("matches").doc(this.editMatchId).get();
        this.form = {
          title: data.title || "",
          date: data.date || "",
          time: data.time || "20:00",
          endTime: data.endTime || "",
          location: data.location || "",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          maxPlayers: data.maxPlayers || 14,
          notes: data.notes || "",
          needScreenshot: data.needScreenshot !== false,
          screenshotDeadline: data.screenshotDeadline || "",
          teamAName: ((_a = data.teamA) == null ? void 0 : _a.name) || "A队",
          teamBName: ((_b = data.teamB) == null ? void 0 : _b.name) || "B队",
          ownerId: data.ownerId || "",
          assistantIds: data.assistantIds || []
        };
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/create.vue:244", "加载失败", e);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    },
    initDate() {
      const d = /* @__PURE__ */ new Date();
      this.form.date = d.toISOString().split("T")[0];
      this.calcScreenshotDeadline();
    },
    calcEndTime() {
      const [h, m] = this.form.time.split(":");
      let endH = parseInt(h) + 1;
      let endM = parseInt(m) + 30;
      if (endM >= 60) {
        endH += 1;
        endM -= 60;
      }
      this.form.endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    },
    onDateChange(e) {
      this.form.date = e.detail.value;
      if (!this.editMode)
        this.calcScreenshotDeadline();
    },
    onTimeChange(e) {
      this.form.time = e.detail.value;
      if (!this.editMode)
        this.calcEndTime();
    },
    onEndTimeChange(e) {
      this.form.endTime = e.detail.value;
    },
    chooseLocation() {
      common_vendor.wx$1.chooseLocation({
        success: (res) => {
          this.form.location = res.name || res.address || "";
          this.form.latitude = res.latitude;
          this.form.longitude = res.longitude;
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes("cancel"))
            return;
          common_vendor.index.__f__("error", "at pages/match/create.vue:281", "地图选点失败", err);
          let msg = "地图选点失败";
          if (err.errMsg && err.errMsg.includes("auth")) {
            msg = "请在设置中开启位置权限";
          } else if (err.errMsg && err.errMsg.includes("permission")) {
            msg = "小程序未开通地理位置接口";
          }
          common_vendor.index.showModal({
            title: "地图选点失败",
            content: msg + "，您可以手动输入地点",
            showCancel: false,
            confirmText: "手动输入"
          });
        }
      });
    },
    onDeadlineDateChange(e) {
      const date = e.detail.value;
      const time = this.form.screenshotDeadline.split("T")[1] || "00:00";
      this.form.screenshotDeadline = `${date}T${time}`;
    },
    onDeadlineTimeChange(e) {
      const time = e.detail.value;
      const date = this.form.screenshotDeadline.split("T")[0] || this.form.date;
      this.form.screenshotDeadline = `${date}T${time}`;
    },
    calcScreenshotDeadline() {
      if (!this.form.date)
        return;
      const matchDate = new Date(this.form.date);
      const deadline = new Date(matchDate.getTime() - 13 * 24 * 60 * 60 * 1e3);
      deadline.setHours(24, 0, 0, 0);
      const y = deadline.getFullYear();
      const m = String(deadline.getMonth() + 1).padStart(2, "0");
      const d = String(deadline.getDate()).padStart(2, "0");
      this.form.screenshotDeadline = `${y}-${m}-${d}T00:00`;
    },
    handleSwitchChange(e) {
      this.form.needScreenshot = e.detail.value;
    },
    async submit() {
      if (!this.form.title.trim()) {
        common_vendor.index.showToast({ title: "请输入场次名称", icon: "none" });
        return;
      }
      const data = {
        title: this.form.title.trim(),
        date: this.form.date,
        time: this.form.time,
        location: this.form.location.trim(),
        notes: this.form.notes.trim(),
        maxPlayers: parseInt(this.form.maxPlayers) || 14,
        needScreenshot: this.form.needScreenshot,
        ownerId: this.form.ownerId || "",
        assistantIds: this.form.assistantIds || []
      };
      if (this.form.endTime)
        data.endTime = this.form.endTime;
      if (this.form.latitude)
        data.latitude = this.form.latitude;
      if (this.form.longitude)
        data.longitude = this.form.longitude;
      if (this.form.needScreenshot && this.form.screenshotDeadline) {
        data.screenshotDeadline = this.form.screenshotDeadline;
      } else {
        data.screenshotDeadline = null;
      }
      common_vendor.wx$1.showLoading({ title: "安全检查中" });
      try {
        const checkFields = [
          { key: "title", value: data.title },
          { key: "location", value: data.location },
          { key: "notes", value: data.notes }
        ];
        for (const field of checkFields) {
          if (field.value) {
            const { result } = await common_vendor.wx$1.cloud.callFunction({
              name: "securityCheck",
              data: { content: field.value }
            });
            if (result && !result.safe) {
              common_vendor.wx$1.hideLoading();
              common_vendor.index.showModal({
                title: "内容安全检查未通过",
                content: `${field.key === "title" ? "场次名称" : field.key === "location" ? "地点" : "备注"}含有违规信息，请修改后重试。`,
                showCancel: false
              });
              return;
            }
          }
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/create.vue:372", "内容安全检查失败:", e);
      }
      common_vendor.wx$1.showLoading({ title: this.editMode ? "保存中" : "创建中" });
      try {
        if (this.editMode) {
          data["teamA.name"] = this.form.teamAName || "蓝队";
          data["teamB.name"] = this.form.teamBName || "白队";
          const { data: oldMatch } = await db.collection("matches").doc(this.editMatchId).get();
          const oldMaxPlayers = oldMatch.maxPlayers || 14;
          const newMaxPlayers = this.form.maxPlayers || 14;
          await db.collection("matches").doc(this.editMatchId).update({ data });
          common_vendor.index.showToast({ title: "保存成功" });
          if (oldMaxPlayers !== newMaxPlayers) {
            common_vendor.wx$1.showLoading({ title: "重新确认名单中" });
            try {
              const { result } = await common_vendor.wx$1.cloud.callFunction({
                name: "processRegistration",
                data: { matchId: this.editMatchId }
              });
              if (result.success) {
                common_vendor.index.showToast({ title: "名单已重新确认" });
                const changedIds = [...result.changed || []];
                if (changedIds.length > 0) {
                  try {
                    await common_vendor.wx$1.cloud.callFunction({
                      name: "sendNotification",
                      data: { type: "confirmed", matchId: this.editMatchId, playerIds: changedIds }
                    });
                  } catch (e) {
                    common_vendor.index.__f__("error", "at pages/match/create.vue:408", "重新确认通知发送失败", e);
                  }
                }
              } else {
                common_vendor.index.showToast({ title: "名单重新确认失败", icon: "none" });
              }
            } catch (e) {
              common_vendor.index.__f__("error", "at pages/match/create.vue:414", "重新确认名单失败", e);
              common_vendor.index.showToast({ title: "名单重新确认失败", icon: "none" });
            }
            common_vendor.wx$1.hideLoading();
          }
          try {
            await common_vendor.wx$1.cloud.callFunction({
              name: "sendNotification",
              data: { type: "new_match", matchId: this.editMatchId, customMessage: "场次信息已更新，请查看最新安排" }
            });
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/match/create.vue:426", "场次更新通知发送失败", e);
          }
          setTimeout(() => common_vendor.index.navigateBack(), 800);
        } else {
          data.status = "upcoming";
          data.registrations = [];
          data.registrationClosed = false;
          data.teamA = { players: [], score: 0, color: "", captainId: "", name: this.form.teamAName || "蓝队" };
          data.teamB = { players: [], score: 0, color: "", captainId: "", name: this.form.teamBName || "白队" };
          data.events = [];
          data.teamConfirmed = false;
          data.createdAt = db.serverDate();
          const res = await db.collection("matches").add({ data });
          const newMatchId = res._id;
          common_vendor.index.showToast({ title: "创建成功" });
          try {
            await common_vendor.wx$1.cloud.callFunction({
              name: "sendNotification",
              data: { type: "new_match", matchId: newMatchId }
            });
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/match/create.vue:448", "新场次通知发送失败", e);
          }
          setTimeout(() => common_vendor.index.navigateBack(), 800);
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/match/create.vue:453", this.editMode ? "保存失败" : "创建失败", e);
        common_vendor.index.showToast({ title: (this.editMode ? "保存" : "创建") + "失败：" + (e.message || e.errMsg || ""), icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    },
    // 选择场主
    pickOwner() {
      const names = this.playersList.map((p) => p.nickname || p.name || "未知");
      const ids = this.playersList.map((p) => p._id);
      common_vendor.index.showActionSheet({
        itemList: names,
        success: (res) => {
          this.form.ownerId = ids[res.tapIndex];
        }
      });
    },
    // 添加护法
    pickAssistant() {
      const available = this.playersList.filter((p) => p._id !== this.form.ownerId && !this.form.assistantIds.includes(p._id));
      if (available.length === 0) {
        common_vendor.index.showToast({ title: "没有可选球员", icon: "none" });
        return;
      }
      const names = available.map((p) => p.nickname || p.name || "未知");
      const ids = available.map((p) => p._id);
      common_vendor.index.showActionSheet({
        itemList: names,
        success: (res) => {
          this.form.assistantIds.push(ids[res.tapIndex]);
        }
      });
    },
    // 移除护法
    removeAssistant(pid) {
      this.form.assistantIds = this.form.assistantIds.filter((id) => id !== pid);
    }
  },
  computed: {
    ownerName() {
      var _a;
      return ((_a = this.playersMap[this.form.ownerId]) == null ? void 0 : _a.nickname) || "";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.form.title,
    b: common_vendor.o(($event) => $data.form.title = $event.detail.value, "50"),
    c: common_vendor.t($data.form.date || "选择日期"),
    d: !$data.form.date ? 1 : "",
    e: $data.form.date,
    f: common_vendor.o((...args) => $options.onDateChange && $options.onDateChange(...args), "00"),
    g: common_vendor.t($data.form.time || "选择时间"),
    h: !$data.form.time ? 1 : "",
    i: $data.form.time,
    j: common_vendor.o((...args) => $options.onTimeChange && $options.onTimeChange(...args), "db"),
    k: common_vendor.t($data.form.endTime || "选择结束时间"),
    l: !$data.form.endTime ? 1 : "",
    m: $data.form.endTime,
    n: common_vendor.o((...args) => $options.onEndTimeChange && $options.onEndTimeChange(...args), "00"),
    o: $data.form.location,
    p: common_vendor.o(($event) => $data.form.location = $event.detail.value, "47"),
    q: common_vendor.o((...args) => $options.chooseLocation && $options.chooseLocation(...args), "89"),
    r: $data.form.latitude && $data.form.longitude
  }, $data.form.latitude && $data.form.longitude ? {
    s: common_vendor.t($data.form.latitude.toFixed(4)),
    t: common_vendor.t($data.form.longitude.toFixed(4))
  } : {}, {
    v: $data.form.maxPlayers,
    w: common_vendor.o(($event) => $data.form.maxPlayers = $event.detail.value, "da"),
    x: common_vendor.t($data.form.needScreenshot ? "需要抽场" : "不需要抽场"),
    y: $data.form.needScreenshot,
    z: common_vendor.o((...args) => $options.handleSwitchChange && $options.handleSwitchChange(...args), "41"),
    A: $data.form.needScreenshot
  }, $data.form.needScreenshot ? {
    B: common_vendor.t($data.form.screenshotDeadline ? $data.form.screenshotDeadline.replace("T", " ") : "未设置"),
    C: common_vendor.o(($event) => $data.showDeadlinePicker = true, "08")
  } : {}, {
    D: $data.showDeadlinePicker
  }, $data.showDeadlinePicker ? {
    E: common_vendor.t($data.form.screenshotDeadline.split("T")[0]),
    F: $data.form.screenshotDeadline.split("T")[0],
    G: common_vendor.o((...args) => $options.onDeadlineDateChange && $options.onDeadlineDateChange(...args), "e3"),
    H: common_vendor.t($data.form.screenshotDeadline.split("T")[1] || "00:00"),
    I: $data.form.screenshotDeadline.split("T")[1] || "00:00",
    J: common_vendor.o((...args) => $options.onDeadlineTimeChange && $options.onDeadlineTimeChange(...args), "d0"),
    K: common_vendor.o(($event) => $data.showDeadlinePicker = false, "cd"),
    L: common_vendor.o(($event) => {
      $options.calcScreenshotDeadline();
      $data.showDeadlinePicker = false;
    }, "d5")
  } : {}, {
    M: $data.form.notes,
    N: common_vendor.o(($event) => $data.form.notes = $event.detail.value, "aa"),
    O: common_vendor.t($options.ownerName || "选择场主"),
    P: !$data.form.ownerId ? 1 : "",
    Q: common_vendor.o((...args) => $options.pickOwner && $options.pickOwner(...args), "6e"),
    R: $data.form.assistantIds.length > 0
  }, $data.form.assistantIds.length > 0 ? {
    S: common_vendor.f($data.form.assistantIds, (pid, k0, i0) => {
      var _a;
      return {
        a: common_vendor.t(((_a = $data.playersMap[pid]) == null ? void 0 : _a.nickname) || "?"),
        b: common_vendor.o(($event) => $options.removeAssistant(pid), pid),
        c: pid
      };
    })
  } : {}, {
    T: common_vendor.o((...args) => $options.pickAssistant && $options.pickAssistant(...args), "50"),
    U: $data.form.teamAName,
    V: common_vendor.o(($event) => $data.form.teamAName = $event.detail.value, "66"),
    W: $data.form.teamBName,
    X: common_vendor.o(($event) => $data.form.teamBName = $event.detail.value, "6d"),
    Y: common_vendor.t($data.editMode ? "保存修改" : "创建场次"),
    Z: common_vendor.o((...args) => $options.submit && $options.submit(...args), "8f")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d04f8779"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/match/create.js.map
