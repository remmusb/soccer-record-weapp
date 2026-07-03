const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 内容安全检查
 * 调用微信 security.msgSecCheck API
 */
async function checkText(content, openid, scene = 1) {
  if (!content || !content.trim()) return { safe: true }; // 空内容视为安全
  
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content,
      version: 2,
      scene: scene,
      openid: openid || ''
    });
    
    // errcode 0 表示通过
    if (res.errCode === 0) {
      return { safe: true };
    }
    
    // 87014 表示内容含有违规
    if (res.errCode === 87014) {
      return { safe: false, error: '内容含有违规信息' };
    }
    
    // 其他错误，记录但允许通过（避免阻塞正常用户）
    console.warn(`[securityCheck] API返回异常: ${res.errCode} - ${res.errMsg}`);
    return { safe: true };
  } catch (e) {
    console.error('[securityCheck] API调用失败:', e);
    // API 调用失败时不阻塞，记录日志后允许通过
    return { safe: true };
  }
}

exports.main = async (event, context) => {
  const { content, openid, scene } = event;
  
  if (!content) {
    return { success: false, error: '缺少 content 参数' };
  }
  
  const result = await checkText(content, openid, scene);
  return { success: true, ...result };
};

// 导出辅助函数供其他云函数使用
exports.checkText = checkText;
