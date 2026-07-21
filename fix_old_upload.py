filepath = r'C:/Users/zhaozw/Documents/kimi/workspace/soccer-record-weapp/pages/match/detail.vue'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 删除旧 uploadScreenshot 代码块（第969-1042行）
old_block = '''    },
      try {
        // 使用 wx.chooseMedia 支持相册和拍照，限制为图片
        const res = await new Promise((resolve, reject) => {
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: resolve,
            fail: reject
          });
        });
        
        if (!res.tempFiles || res.tempFiles.length === 0) {
          uni.showToast({ title: '未选择图片', icon: 'none' });
          return;
        }
        
        let tempFilePath = res.tempFiles[0].tempFilePath;
        let fileSize = res.tempFiles[0].size || 0;
        
        // 如果图片大于 2MB，尝试压缩
        if (fileSize > 2 * 1024 * 1024) {
          uni.showLoading({ title: '压缩图片中...' });
          try {
            const compressRes = await new Promise((resolve, reject) => {
              wx.compressImage({
                src: tempFilePath,
                quality: 70,
                success: resolve,
                fail: reject
              });
            });
            tempFilePath = compressRes.tempFilePath;
          } catch (compressErr) {
            console.log('图片压缩失败，使用原图', compressErr);
          }
        }
        
        uni.showLoading({ title: '上传中' });
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: `screenshots/${this.matchId}/${this.currentPlayerId}_${Date.now()}.jpg`,
            filePath: tempFilePath
          });
          
          const { result } = await wx.cloud.callFunction({
            name: 'registerMatch',
            data: { action: 'uploadScreenshot', matchId: this.matchId, playerId: this.currentPlayerId, screenshot: uploadRes.fileID }
          });
          
          if (result.success) { 
            uni.showToast({ title: '截图上传成功' }); 
            this.loadMatch(); 
          }
          else { 
            uni.showToast({ title: result.error || '上传失败', icon: 'none', duration: 3000 }); 
          }
        } catch (e) { 
          console.error('上传截图失败', e);
          const errMsg = e.message || e.errMsg || '未知错误';
          if (errMsg.includes('exceed max size') || errMsg.includes('文件过大')) {
            uni.showToast({ title: '图片过大，请压缩后再试', icon: 'none', duration: 3000 });
          } else if (errMsg.includes('fail')) {
            uni.showToast({ title: '上传失败: ' + errMsg, icon: 'none', duration: 3000 });
          } else {
            uni.showToast({ title: '上传失败，请重试', icon: 'none', duration: 3000 }); 
          }
        }
        uni.hideLoading();
      } catch (e) {
        // 用户取消选择，不做处理
        console.log('选择图片取消或失败', e);
      }
    },'''

new_block = '''    },'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print('成功删除旧 uploadScreenshot 代码残留')
else:
    print('未找到目标代码块')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
