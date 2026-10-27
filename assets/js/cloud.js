/* =========================================================
   JXZZ · 云服务接入
   ---------------------------------------------------------
   初始化 WorkBuddy Cloud Service 客户端。
   publicConfig 三项均来自开通云服务后的返回，publishableKey
   仅标识"哪个应用"、本身不带权限，可安全放在前端；
   真正的鉴权由服务端按 Origin 校验 + 数据库 RLS 完成。
   ========================================================= */
(function () {
  'use strict';

  var publicConfig = {
    endpoint: 'https://jxzz-official.app.workbuddy.host',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
    publishableKey: 'wbpk_12GVIDTE242SI1snehRf6X_As2okz6k09Do97TcL2CLKQOfRoED17xG'
  };

  // 联系邮箱：云端不可用时的兜底渠道（与页脚保持一致，替换真实邮箱时同步修改）
  var FALLBACK_EMAIL = 'contact@jxzz-tech.com';

  function createClient() {
    if (typeof window.WorkBuddyCloud === 'undefined') return null;
    try {
      return window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: publicConfig.endpoint,
        oauthRelayBaseUrl: publicConfig.oauthRelayBaseUrl,
        publishableKey: publicConfig.publishableKey
      });
    } catch (err) {
      return null;
    }
  }

  window.JXZZ = window.JXZZ || {};
  window.JXZZ.publicConfig = publicConfig;
  window.JXZZ.fallbackEmail = FALLBACK_EMAIL;
  window.JXZZ.cloud = createClient();
})();
