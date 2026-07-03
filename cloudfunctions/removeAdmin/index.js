const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const { adminId } = event;
  
  if (!adminId) return { success: false, error: '缺少 adminId' };
  
  await db.collection('admins').doc(adminId).remove();
  return { success: true };
};
