"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/match/create.js";
  "./pages/match/detail.js";
  "./pages/match/record.js";
  "./pages/match/teamSplit.js";
  "./pages/players/list.js";
  "./pages/players/create.js";
  "./pages/match/rate.js";
  "./pages/players/detail.js";
  "./pages/stats/index.js";
  "./pages/players/my.js";
  "./pages/settings/index.js";
}
const _sfc_main = {
  onLaunch() {
    common_vendor.index.__f__("log", "at App.vue:4", "App Launch");
    if (common_vendor.wx$1.cloud) {
      common_vendor.wx$1.cloud.init({
        env: common_vendor.wx$1.cloud.DYNAMIC_CURRENT_ENV,
        // 自动使用当前关联的环境
        traceUser: true
      });
    }
  },
  onShow() {
    common_vendor.index.__f__("log", "at App.vue:14", "App Show");
  },
  onHide() {
    common_vendor.index.__f__("log", "at App.vue:17", "App Hide");
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
