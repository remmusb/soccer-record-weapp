const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { fileID } = event;
  if (!fileID) {
    return { success: false, error: '缺少 fileID' };
  }

  try {
    const res = await cloud.getTempFileURL({
      fileList: [fileID],
    });

    const file = res.fileList[0];
    if (!file || file.status !== 0 || !file.tempFileURL) {
      return {
        success: false,
        error: file?.errMsg === 'STORAGE_EXCEED_AUTHORITY'
          ? '截图文件已删除或过期'
          : '获取截图链接失败',
      };
    }

    return { success: true, url: file.tempFileURL };
  } catch (e) {
    return { success: false, error: e.message || '获取截图链接失败' };
  }
};
