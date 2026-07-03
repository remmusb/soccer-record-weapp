"use strict";
const common_vendor = require("../../common/vendor.js");
const POSITIONS = [
  { id: "GK", name: "门将", icon: "🧤" },
  { id: "CB", name: "中后卫", icon: "🛡️" },
  { id: "LB", name: "左后卫", icon: "⬅️" },
  { id: "RB", name: "右后卫", icon: "➡️" },
  { id: "CDM", name: "后腰", icon: "⚓" },
  { id: "CM", name: "中场", icon: "⚙️" },
  { id: "CAM", name: "前腰", icon: "🎨" },
  { id: "LW", name: "左边锋", icon: "↖️" },
  { id: "RW", name: "右边锋", icon: "↗️" },
  { id: "ST", name: "前锋", icon: "⚽" },
  { id: "CF", name: "中锋", icon: "🎯" }
];
const _sfc_main = {
  data() {
    return {
      user: {},
      form: {
        nickname: "",
        name: "",
        avatarUrl: "",
        birthDate: "",
        positions: []
      },
      editing: false,
      stats: { games: 0, goals: 0, assists: 0, mvp: 0 },
      subscribed: false
    };
  },
  computed: {
    positionMap() {
      const map = {};
      POSITIONS.forEach((p) => {
        map[p.id] = p.name;
      });
      return map;
    }
  },
  onShow() {
    this.loadUser();
  },
  onShareAppMessage() {
    return {
      title: "我的球员档案",
      path: "/pages/players/my"
    };
  },
  methods: {
    async loadUser() {
      try {
        const loginRes = await common_vendor.wx$1.cloud.callFunction({ name: "login" });
        const openid = loginRes.result.openid;
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "getPlayers" });
        const allPlayers = result.players || [];
        const myList = allPlayers.filter((p) => p._openid === openid);
        if (myList.length > 0) {
          this.user = myList[0];
          if (!this.user.avatarUrl && this.user.avatar) {
            this.user.avatarUrl = this.user.avatar;
          }
          this.stats = myList[0].stats || {
            games: 0,
            goals: 0,
            assists: 0,
            mvp: 0
          };
          this.subscribed = myList[0].subscribed || false;
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/my.vue:293", "加载用户信息失败:", e);
      }
    },
    goEdit() {
      this.$set(this.form, "nickname", this.user.nickname || "");
      this.$set(this.form, "name", this.user.name || "");
      this.$set(this.form, "avatarUrl", this.user.avatarUrl || this.user.avatar || "");
      this.$set(this.form, "birthDate", this.user.birthDate || "");
      this.$set(this.form, "positions", [...this.user.positions || []]);
      this.$set(this.form, "allowRating", this.user.allowRating !== false);
      this.$set(this.form, "height", this.user.height || "");
      this.$set(this.form, "weight", this.user.weight || "");
      this.$set(this.form, "foot", this.user.foot || "");
      this.editing = true;
    },
    cancelEdit() {
      this.editing = false;
    },
    async saveProfile() {
      common_vendor.wx$1.showLoading({ title: "安全检查中" });
      try {
        const checkFields = [
          { key: "nickname", value: this.form.nickname.trim() },
          { key: "name", value: this.form.name.trim() }
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
                content: `${field.key === "nickname" ? "昵称" : "姓名"}含有违规信息，请修改后重试。`,
                showCancel: false
              });
              return;
            }
          }
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/my.vue:340", "内容安全检查失败:", e);
      }
      common_vendor.wx$1.showLoading({ title: "保存中" });
      try {
        const db = common_vendor.wx$1.cloud.database();
        await db.collection("players").doc(this.user._id).update({
          data: {
            name: this.form.name.trim(),
            nickname: this.form.nickname.trim(),
            avatar: this.form.avatarUrl || "",
            birthDate: this.form.birthDate || "",
            height: this.form.height || "",
            weight: this.form.weight || "",
            foot: this.form.foot || "",
            positions: this.form.positions || [],
            allowRating: this.form.allowRating !== false
          }
        });
        common_vendor.index.showToast({ title: "保存成功", icon: "success" });
        this.editing = false;
        await this.loadUser();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/my.vue:363", "保存失败:", e);
        common_vendor.index.showToast({ title: "保存失败", icon: "none" });
      } finally {
        common_vendor.wx$1.hideLoading();
      }
    },
    async saveNewPlayer() {
      common_vendor.wx$1.showLoading({ title: "安全检查中" });
      try {
        const checkFields = [
          { key: "nickname", value: this.form.nickname.trim() },
          { key: "name", value: this.form.name.trim() }
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
                content: `${field.key === "nickname" ? "昵称" : "姓名"}含有违规信息，请修改后重试。`,
                showCancel: false
              });
              return;
            }
          }
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/my.vue:396", "内容安全检查失败:", e);
      }
      common_vendor.wx$1.showLoading({ title: "注册中" });
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({
          name: "createPlayer",
          data: {
            nickname: this.form.nickname,
            name: this.form.name,
            avatarUrl: this.form.avatarUrl,
            birthDate: this.form.birthDate,
            height: this.form.height || "",
            weight: this.form.weight || "",
            foot: this.form.foot || "",
            positions: this.form.positions,
            allowRating: this.form.allowRating !== false
          }
        });
        if (result && result.success) {
          common_vendor.index.showToast({ title: "注册成功", icon: "success" });
          await this.loadUser();
        } else {
          common_vendor.index.showToast({ title: "注册失败", icon: "none" });
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/my.vue:422", "注册失败:", e);
        common_vendor.index.showToast({ title: "注册失败", icon: "none" });
      } finally {
        common_vendor.wx$1.hideLoading();
      }
    },
    async requestSubscribeAuth(e) {
      try {
        const res = await common_vendor.wx$1.requestSubscribeMessage({
          tmplIds: [
            "b__Xfgl9V5Gb4wR620BxvGwkNYUc-7GTIhMbvCaVl7Y",
            "9yHUbypikNHuoi24brxXjx1ssA23qOhL-7wkKr7Yno8"
          ]
        });
        common_vendor.index.__f__("log", "at pages/players/my.vue:437", "订阅结果", res);
        const accepted = Object.values(res).some((v) => v === "accept");
        if (accepted) {
          this.subscribed = true;
          common_vendor.index.showToast({ title: "授权成功", icon: "success" });
        } else {
          common_vendor.index.showToast({ title: "未授权，可在设置中开启", icon: "none" });
        }
      } catch (e2) {
        common_vendor.index.__f__("error", "at pages/players/my.vue:446", "订阅授权失败", e2);
        common_vendor.index.showToast({ title: "授权失败", icon: "none" });
      }
    },
    chooseAvatarFromAlbum() {
      common_vendor.wx$1.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        success: (res) => {
          const tempFilePath = res.tempFiles[0].tempFilePath;
          this.uploadAvatar(tempFilePath);
        },
        fail: (e) => {
          common_vendor.index.__f__("error", "at pages/players/my.vue:461", "选择图片失败:", e);
        }
      });
    },
    onChooseAvatar(e) {
      const { avatarUrl } = e.detail;
      if (avatarUrl) {
        this.uploadAvatar(avatarUrl);
      }
    },
    onBirthDateChange(e) {
      this.form.birthDate = e.detail.value;
    },
    togglePosition(pos) {
      if (!this.form.positions) {
        this.$set(this.form, "positions", []);
      }
      const index = this.form.positions.indexOf(pos);
      if (index > -1) {
        this.form.positions.splice(index, 1);
      } else {
        this.form.positions.push(pos);
      }
    },
    goSettings() {
      common_vendor.index.navigateTo({
        url: "/pages/settings/index"
      });
    },
    async uploadAvatar(tempFilePath) {
      try {
        const ext = tempFilePath.split(".").pop() || "jpg";
        const cloudPath = `avatars/${Date.now()}.${ext}`;
        const { fileID } = await common_vendor.wx$1.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath
        });
        this.form.avatarUrl = fileID;
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/my.vue:505", "上传头像失败:", e);
        common_vendor.index.showToast({ title: "上传头像失败", icon: "none" });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.user._id
  }, !$data.user._id ? common_vendor.e({
    b: $data.form.nickname,
    c: common_vendor.o(($event) => $data.form.nickname = $event.detail.value, "fe"),
    d: $data.form.name,
    e: common_vendor.o(($event) => $data.form.name = $event.detail.value, "07"),
    f: common_vendor.o((...args) => $options.onChooseAvatar && $options.onChooseAvatar(...args), "1f"),
    g: common_vendor.o((...args) => $options.chooseAvatarFromAlbum && $options.chooseAvatarFromAlbum(...args), "42"),
    h: $data.form.avatarUrl
  }, $data.form.avatarUrl ? {
    i: $data.form.avatarUrl
  } : {}, {
    j: common_vendor.t($data.form.birthDate || "请选择生日"),
    k: $data.form.birthDate,
    l: common_vendor.o((...args) => $options.onBirthDateChange && $options.onBirthDateChange(...args), "26"),
    m: ($data.form.positions || []).includes("GK") ? 1 : "",
    n: common_vendor.o(($event) => $options.togglePosition("GK"), "59"),
    o: ($data.form.positions || []).includes("CB") ? 1 : "",
    p: common_vendor.o(($event) => $options.togglePosition("CB"), "68"),
    q: ($data.form.positions || []).includes("LB") ? 1 : "",
    r: common_vendor.o(($event) => $options.togglePosition("LB"), "67"),
    s: ($data.form.positions || []).includes("RB") ? 1 : "",
    t: common_vendor.o(($event) => $options.togglePosition("RB"), "30"),
    v: ($data.form.positions || []).includes("CDM") ? 1 : "",
    w: common_vendor.o(($event) => $options.togglePosition("CDM"), "70"),
    x: ($data.form.positions || []).includes("CM") ? 1 : "",
    y: common_vendor.o(($event) => $options.togglePosition("CM"), "b0"),
    z: ($data.form.positions || []).includes("CAM") ? 1 : "",
    A: common_vendor.o(($event) => $options.togglePosition("CAM"), "38"),
    B: ($data.form.positions || []).includes("LW") ? 1 : "",
    C: common_vendor.o(($event) => $options.togglePosition("LW"), "da"),
    D: ($data.form.positions || []).includes("RW") ? 1 : "",
    E: common_vendor.o(($event) => $options.togglePosition("RW"), "98"),
    F: ($data.form.positions || []).includes("ST") ? 1 : "",
    G: common_vendor.o(($event) => $options.togglePosition("ST"), "2e"),
    H: ($data.form.positions || []).includes("CF") ? 1 : "",
    I: common_vendor.o(($event) => $options.togglePosition("CF"), "68"),
    J: $data.form.positions && $data.form.positions.length > 0
  }, $data.form.positions && $data.form.positions.length > 0 ? {
    K: common_vendor.t($data.form.positions.join("、"))
  } : {}, {
    L: $data.form.height,
    M: common_vendor.o(($event) => $data.form.height = $event.detail.value, "45"),
    N: $data.form.weight,
    O: common_vendor.o(($event) => $data.form.weight = $event.detail.value, "1b"),
    P: $data.form.foot === "左脚" ? 1 : "",
    Q: common_vendor.o(($event) => $data.form.foot = "左脚", "f7"),
    R: $data.form.foot === "右脚" ? 1 : "",
    S: common_vendor.o(($event) => $data.form.foot = "右脚", "42"),
    T: $data.form.foot === "左右脚" ? 1 : "",
    U: common_vendor.o(($event) => $data.form.foot = "左右脚", "45"),
    V: common_vendor.o((...args) => $options.saveNewPlayer && $options.saveNewPlayer(...args), "21")
  }) : common_vendor.e({
    W: $data.editing
  }, $data.editing ? common_vendor.e({
    X: $data.form.nickname,
    Y: common_vendor.o(($event) => $data.form.nickname = $event.detail.value, "32"),
    Z: $data.form.name,
    aa: common_vendor.o(($event) => $data.form.name = $event.detail.value, "d7"),
    ab: common_vendor.o((...args) => $options.onChooseAvatar && $options.onChooseAvatar(...args), "b2"),
    ac: common_vendor.o((...args) => $options.chooseAvatarFromAlbum && $options.chooseAvatarFromAlbum(...args), "6a"),
    ad: $data.form.avatarUrl
  }, $data.form.avatarUrl ? {
    ae: $data.form.avatarUrl
  } : {}, {
    af: common_vendor.t($data.form.birthDate || "请选择生日"),
    ag: $data.form.birthDate,
    ah: common_vendor.o((...args) => $options.onBirthDateChange && $options.onBirthDateChange(...args), "4f"),
    ai: ($data.form.positions || []).includes("GK") ? 1 : "",
    aj: common_vendor.o(($event) => $options.togglePosition("GK"), "c2"),
    ak: ($data.form.positions || []).includes("CB") ? 1 : "",
    al: common_vendor.o(($event) => $options.togglePosition("CB"), "37"),
    am: ($data.form.positions || []).includes("LB") ? 1 : "",
    an: common_vendor.o(($event) => $options.togglePosition("LB"), "72"),
    ao: ($data.form.positions || []).includes("RB") ? 1 : "",
    ap: common_vendor.o(($event) => $options.togglePosition("RB"), "84"),
    aq: ($data.form.positions || []).includes("CDM") ? 1 : "",
    ar: common_vendor.o(($event) => $options.togglePosition("CDM"), "4f"),
    as: ($data.form.positions || []).includes("CM") ? 1 : "",
    at: common_vendor.o(($event) => $options.togglePosition("CM"), "f8"),
    av: ($data.form.positions || []).includes("CAM") ? 1 : "",
    aw: common_vendor.o(($event) => $options.togglePosition("CAM"), "ff"),
    ax: ($data.form.positions || []).includes("LW") ? 1 : "",
    ay: common_vendor.o(($event) => $options.togglePosition("LW"), "0c"),
    az: ($data.form.positions || []).includes("RW") ? 1 : "",
    aA: common_vendor.o(($event) => $options.togglePosition("RW"), "d5"),
    aB: ($data.form.positions || []).includes("ST") ? 1 : "",
    aC: common_vendor.o(($event) => $options.togglePosition("ST"), "f8"),
    aD: ($data.form.positions || []).includes("CF") ? 1 : "",
    aE: common_vendor.o(($event) => $options.togglePosition("CF"), "e1"),
    aF: $data.form.positions && $data.form.positions.length > 0
  }, $data.form.positions && $data.form.positions.length > 0 ? {
    aG: common_vendor.t($data.form.positions.join("、"))
  } : {}, {
    aH: $data.form.height,
    aI: common_vendor.o(($event) => $data.form.height = $event.detail.value, "1d"),
    aJ: $data.form.weight,
    aK: common_vendor.o(($event) => $data.form.weight = $event.detail.value, "f1"),
    aL: $data.form.foot === "左脚" ? 1 : "",
    aM: common_vendor.o(($event) => $data.form.foot = "左脚", "f5"),
    aN: $data.form.foot === "右脚" ? 1 : "",
    aO: common_vendor.o(($event) => $data.form.foot = "右脚", "c4"),
    aP: $data.form.foot === "左右脚" ? 1 : "",
    aQ: common_vendor.o(($event) => $data.form.foot = "左右脚", "42"),
    aR: $data.form.allowRating ? 1 : "",
    aS: common_vendor.o(($event) => $data.form.allowRating = true, "5d"),
    aT: !$data.form.allowRating ? 1 : "",
    aU: common_vendor.o(($event) => $data.form.allowRating = false, "8a"),
    aV: common_vendor.o((...args) => $options.cancelEdit && $options.cancelEdit(...args), "2e"),
    aW: common_vendor.o((...args) => $options.saveProfile && $options.saveProfile(...args), "d3")
  }) : common_vendor.e({
    aX: $data.user.avatar || "/static/default-avatar.png",
    aY: common_vendor.t($data.user.nickname),
    aZ: common_vendor.t($data.user.name),
    ba: common_vendor.f($data.user.positions, (pos, k0, i0) => {
      return {
        a: common_vendor.t($options.positionMap[pos] || pos),
        b: pos
      };
    }),
    bb: $data.user.height || $data.user.weight || $data.user.foot
  }, $data.user.height || $data.user.weight || $data.user.foot ? common_vendor.e({
    bc: $data.user.height
  }, $data.user.height ? {
    bd: common_vendor.t($data.user.height)
  } : {}, {
    be: $data.user.weight
  }, $data.user.weight ? {
    bf: common_vendor.t($data.user.weight)
  } : {}, {
    bg: $data.user.foot
  }, $data.user.foot ? {
    bh: common_vendor.t($data.user.foot)
  } : {}) : {}, {
    bi: common_vendor.o((...args) => $options.goEdit && $options.goEdit(...args), "07"),
    bj: common_vendor.t($data.stats.games || 0),
    bk: common_vendor.t($data.stats.goals || 0),
    bl: common_vendor.t($data.stats.assists || 0),
    bm: common_vendor.t($data.stats.mvp || 0),
    bn: $data.subscribed,
    bo: common_vendor.o((...args) => $options.requestSubscribeAuth && $options.requestSubscribeAuth(...args), "27"),
    bp: common_vendor.o((...args) => $options.goSettings && $options.goSettings(...args), "f5")
  })));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/players/my.js.map
