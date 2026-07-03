"use strict";
const common_vendor = require("../../common/vendor.js");
const db = common_vendor.wx$1.cloud.database();
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
      POSITIONS,
      loading: true,
      myPlayer: null,
      isAdmin: false,
      form: { name: "", nickname: "", kttLast4: "", birthDate: "", positions: [], initialRating: 5, avatar: "", allowRating: true },
      adminForm: { name: "", nickname: "", kttLast4: "", birthDate: "", positions: [], initialRating: 5, avatar: "", allowRating: true }
    };
  },
  onLoad() {
    this.checkUser();
  },
  methods: {
    async checkUser() {
      var _a;
      this.loading = true;
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({ name: "login" });
        const openid = result.openid;
        this.openid = openid;
        this.isAdmin = result.isAdmin || false;
        const { data: myList } = await db.collection("players").where({ _openid: openid }).get();
        if (myList.length > 0) {
          this.myPlayer = myList[0];
          this.form = {
            name: myList[0].name,
            nickname: myList[0].nickname,
            kttLast4: myList[0].kttLast4 || "",
            birthDate: myList[0].birthDate || "",
            positions: myList[0].positions || [],
            initialRating: ((_a = myList[0].ratings) == null ? void 0 : _a.initialRating) || 5,
            allowRating: myList[0].allowRating !== false,
            avatar: myList[0].avatar || ""
          };
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/create.vue:306", "检查用户失败", e);
      }
      this.loading = false;
    },
    togglePosition(id) {
      const idx = this.form.positions.indexOf(id);
      if (idx >= 0)
        this.form.positions.splice(idx, 1);
      else
        this.form.positions.push(id);
    },
    toggleAdminPosition(id) {
      const idx = this.adminForm.positions.indexOf(id);
      if (idx >= 0)
        this.adminForm.positions.splice(idx, 1);
      else
        this.adminForm.positions.push(id);
    },
    chooseAvatarFromAlbum(type) {
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (imgRes) => {
          common_vendor.wx$1.showLoading({ title: "上传中" });
          try {
            const uploadRes = await common_vendor.wx$1.cloud.uploadFile({
              cloudPath: `avatars/${Date.now()}_${Math.floor(Math.random() * 1e3)}.jpg`,
              filePath: imgRes.tempFilePaths[0]
            });
            if (type === "my")
              this.form.avatar = uploadRes.fileID;
            else
              this.adminForm.avatar = uploadRes.fileID;
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/players/create.vue:335", "头像上传失败", e);
            common_vendor.index.showToast({ title: "上传失败", icon: "none" });
          }
          common_vendor.wx$1.hideLoading();
        }
      });
    },
    async onChooseAvatar(e, type) {
      var _a;
      const tempFilePath = (_a = e.detail) == null ? void 0 : _a.avatarUrl;
      if (!tempFilePath) {
        common_vendor.index.showToast({ title: "未获取到头像", icon: "none" });
        return;
      }
      common_vendor.wx$1.showLoading({ title: "上传中" });
      try {
        const uploadRes = await common_vendor.wx$1.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.floor(Math.random() * 1e3)}.jpg`,
          filePath: tempFilePath
        });
        if (type === "my")
          this.form.avatar = uploadRes.fileID;
        else
          this.adminForm.avatar = uploadRes.fileID;
        common_vendor.index.showToast({ title: "头像已设置", icon: "none" });
      } catch (e2) {
        common_vendor.index.__f__("error", "at pages/players/create.vue:358", "头像上传失败", e2);
        common_vendor.index.showToast({ title: "上传失败", icon: "none" });
      }
      common_vendor.wx$1.hideLoading();
    },
    onBirthDateChange(e) {
      this.form.birthDate = e.detail.value;
    },
    onAdminBirthDateChange(e) {
      this.adminForm.birthDate = e.detail.value;
    },
    async createMyPlayer() {
      if (!this.form.nickname.trim()) {
        common_vendor.index.showToast({ title: "请输入昵称", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "创建中", mask: true });
      const ir = this.form.initialRating || 5;
      const compositeRating = Math.min(10, Math.max(1, Math.round((ir * 0.8 + 1) * 10) / 10));
      try {
        await db.collection("players").add({
          data: {
            name: this.form.name.trim(),
            nickname: this.form.nickname.trim(),
            kttLast4: this.form.kttLast4 || "",
            birthDate: this.form.birthDate || "",
            positions: this.form.positions,
            avatar: this.form.avatar || "",
            allowRating: this.form.allowRating !== false,
            ratings: {
              initialRating: ir,
              peerRatings: [],
              adminRatings: []
            },
            stats: {
              appearances: 0,
              goals: 0,
              assists: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              yellowCards: 0,
              redCards: 0,
              ownGoals: 0,
              rating: compositeRating,
              ownerCount: 0,
              assistantCount: 0,
              adminAvg: ir,
              peerAvg: ir,
              performanceRating: 5
            },
            createdAt: /* @__PURE__ */ new Date()
          }
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "创建成功", icon: "success" });
        setTimeout(() => {
          this.checkUser();
          const pages = getCurrentPages();
          if (pages.length > 1) {
            common_vendor.index.navigateBack();
          }
        }, 800);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/create.vue:413", e);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "创建失败：" + (e.message || e.errMsg || ""), icon: "none", duration: 3e3 });
      }
    },
    async updateMyPlayer() {
      if (!this.form.nickname.trim()) {
        common_vendor.index.showToast({ title: "请输入昵称", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "保存中", mask: true });
      try {
        await db.collection("players").doc(this.myPlayer._id).update({
          data: {
            name: this.form.name.trim(),
            nickname: this.form.nickname.trim(),
            kttLast4: this.form.kttLast4 || "",
            birthDate: this.form.birthDate || "",
            positions: this.form.positions,
            allowRating: this.form.allowRating !== false,
            "ratings.initialRating": this.form.initialRating || 5,
            avatar: this.form.avatar || ""
          }
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "保存成功", icon: "success" });
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/create.vue:440", e);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "保存失败", icon: "none" });
      }
    },
    async createOtherPlayer() {
      if (!this.adminForm.nickname.trim()) {
        common_vendor.index.showToast({ title: "请输入昵称", icon: "none" });
        return;
      }
      common_vendor.index.showLoading({ title: "创建中", mask: true });
      try {
        const { result } = await common_vendor.wx$1.cloud.callFunction({
          name: "createPlayer",
          data: {
            name: this.adminForm.name.trim(),
            nickname: this.adminForm.nickname.trim(),
            kttLast4: this.adminForm.kttLast4 || "",
            birthDate: this.adminForm.birthDate || "",
            positions: this.adminForm.positions,
            avatar: this.adminForm.avatar || "",
            initialRating: this.adminForm.initialRating || 5,
            allowRating: this.adminForm.allowRating !== false
          }
        });
        if (result.success) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "添加成功", icon: "success" });
          this.adminForm = { name: "", nickname: "", kttLast4: "", birthDate: "", positions: [], initialRating: 5, avatar: "", allowRating: true };
        } else {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: result.error || "添加失败", icon: "none" });
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/players/create.vue:474", e);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "添加失败", icon: "none" });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d;
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {} : $data.myPlayer ? common_vendor.e({
    c: $data.form.avatar
  }, $data.form.avatar ? {
    d: $data.form.avatar
  } : {
    e: common_vendor.t(((_a = $data.myPlayer.nickname) == null ? void 0 : _a[0]) || "?")
  }, {
    f: common_vendor.t($data.myPlayer.nickname),
    g: $data.form.avatar
  }, $data.form.avatar ? {
    h: $data.form.avatar
  } : {
    i: common_vendor.t(((_b = $data.form.nickname) == null ? void 0 : _b[0]) || "?")
  }, {
    j: common_vendor.o(($event) => $options.chooseAvatarFromAlbum("my"), "5c"),
    k: common_vendor.o(($event) => $options.onChooseAvatar($event, "my"), "84"),
    l: $data.form.name,
    m: common_vendor.o(($event) => $data.form.name = $event.detail.value, "8f"),
    n: $data.form.nickname,
    o: common_vendor.o(($event) => $data.form.nickname = $event.detail.value, "bf"),
    p: $data.form.kttLast4,
    q: common_vendor.o(($event) => $data.form.kttLast4 = $event.detail.value, "e8"),
    r: common_vendor.t($data.form.birthDate || "选择出生年月"),
    s: !$data.form.birthDate ? 1 : "",
    t: $data.form.birthDate,
    v: common_vendor.o((...args) => $options.onBirthDateChange && $options.onBirthDateChange(...args), "06"),
    w: common_vendor.f(10, (i, k0, i0) => {
      return {
        a: common_vendor.t(i),
        b: i,
        c: ($data.form.initialRating || 5) >= i ? 1 : "",
        d: common_vendor.o(($event) => $data.form.initialRating = i, i)
      };
    }),
    x: common_vendor.t($data.form.initialRating || 5),
    y: $data.form.allowRating !== false ? 1 : "",
    z: common_vendor.o(($event) => $data.form.allowRating = true, "d3"),
    A: $data.form.allowRating === false ? 1 : "",
    B: common_vendor.o(($event) => $data.form.allowRating = false, "17"),
    C: common_vendor.f($data.POSITIONS, (pos, k0, i0) => {
      return {
        a: common_vendor.t(pos.icon),
        b: common_vendor.t(pos.name),
        c: pos.id,
        d: $data.form.positions.includes(pos.id) ? 1 : "",
        e: common_vendor.o(($event) => $options.togglePosition(pos.id), pos.id)
      };
    }),
    D: common_vendor.o((...args) => $options.updateMyPlayer && $options.updateMyPlayer(...args), "ae")
  }) : common_vendor.e({
    E: $data.form.avatar
  }, $data.form.avatar ? {
    F: $data.form.avatar
  } : {
    G: common_vendor.t(((_c = $data.form.nickname) == null ? void 0 : _c[0]) || "?")
  }, {
    H: common_vendor.o(($event) => $options.chooseAvatarFromAlbum("my"), "a7"),
    I: common_vendor.o(($event) => $options.onChooseAvatar($event, "my"), "78"),
    J: $data.form.name,
    K: common_vendor.o(($event) => $data.form.name = $event.detail.value, "ac"),
    L: $data.form.nickname,
    M: common_vendor.o(($event) => $data.form.nickname = $event.detail.value, "c6"),
    N: $data.form.kttLast4,
    O: common_vendor.o(($event) => $data.form.kttLast4 = $event.detail.value, "5d"),
    P: common_vendor.t($data.form.birthDate || "选择出生年月"),
    Q: !$data.form.birthDate ? 1 : "",
    R: $data.form.birthDate,
    S: common_vendor.o((...args) => $options.onBirthDateChange && $options.onBirthDateChange(...args), "b2"),
    T: common_vendor.f(10, (i, k0, i0) => {
      return {
        a: common_vendor.t(i),
        b: i,
        c: ($data.form.initialRating || 5) >= i ? 1 : "",
        d: common_vendor.o(($event) => $data.form.initialRating = i, i)
      };
    }),
    U: common_vendor.t($data.form.initialRating || 5),
    V: $data.form.allowRating !== false ? 1 : "",
    W: common_vendor.o(($event) => $data.form.allowRating = true, "45"),
    X: $data.form.allowRating === false ? 1 : "",
    Y: common_vendor.o(($event) => $data.form.allowRating = false, "1f"),
    Z: common_vendor.f($data.POSITIONS, (pos, k0, i0) => {
      return {
        a: common_vendor.t(pos.icon),
        b: common_vendor.t(pos.name),
        c: pos.id,
        d: $data.form.positions.includes(pos.id) ? 1 : "",
        e: common_vendor.o(($event) => $options.togglePosition(pos.id), pos.id)
      };
    }),
    aa: common_vendor.o((...args) => $options.createMyPlayer && $options.createMyPlayer(...args), "f1")
  }), {
    b: $data.myPlayer,
    ab: $data.isAdmin
  }, $data.isAdmin ? common_vendor.e({
    ac: $data.adminForm.avatar
  }, $data.adminForm.avatar ? {
    ad: $data.adminForm.avatar
  } : {
    ae: common_vendor.t(((_d = $data.adminForm.nickname) == null ? void 0 : _d[0]) || "?")
  }, {
    af: common_vendor.o(($event) => $options.chooseAvatarFromAlbum("admin"), "ce"),
    ag: common_vendor.o(($event) => $options.onChooseAvatar($event, "admin"), "e4"),
    ah: $data.adminForm.name,
    ai: common_vendor.o(($event) => $data.adminForm.name = $event.detail.value, "87"),
    aj: $data.adminForm.nickname,
    ak: common_vendor.o(($event) => $data.adminForm.nickname = $event.detail.value, "60"),
    al: $data.adminForm.kttLast4,
    am: common_vendor.o(($event) => $data.adminForm.kttLast4 = $event.detail.value, "cb"),
    an: common_vendor.t($data.adminForm.birthDate || "选择出生年月"),
    ao: !$data.adminForm.birthDate ? 1 : "",
    ap: $data.adminForm.birthDate,
    aq: common_vendor.o((...args) => $options.onAdminBirthDateChange && $options.onAdminBirthDateChange(...args), "0a"),
    ar: common_vendor.f(10, (i, k0, i0) => {
      return {
        a: common_vendor.t(i),
        b: i,
        c: ($data.adminForm.initialRating || 5) >= i ? 1 : "",
        d: common_vendor.o(($event) => $data.adminForm.initialRating = i, i)
      };
    }),
    as: $data.adminForm.allowRating !== false ? 1 : "",
    at: common_vendor.o(($event) => $data.adminForm.allowRating = true, "e5"),
    av: $data.adminForm.allowRating === false ? 1 : "",
    aw: common_vendor.o(($event) => $data.adminForm.allowRating = false, "36"),
    ax: common_vendor.f($data.POSITIONS, (pos, k0, i0) => {
      return {
        a: common_vendor.t(pos.icon),
        b: common_vendor.t(pos.name),
        c: pos.id,
        d: $data.adminForm.positions.includes(pos.id) ? 1 : "",
        e: common_vendor.o(($event) => $options.toggleAdminPosition(pos.id), pos.id)
      };
    }),
    ay: common_vendor.o((...args) => $options.createOtherPlayer && $options.createOtherPlayer(...args), "de")
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-61950c3a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/players/create.js.map
