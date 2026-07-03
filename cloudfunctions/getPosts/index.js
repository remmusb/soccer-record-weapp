const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { matchId } = event

  try {
    const postsRes = await db.collection('posts')
      .where({ matchId })
      .orderBy('createdAt', 'desc')
      .get()

    const posts = postsRes.data

    // 收集所有需要查询的 playerId
    const playerIds = new Set()
    posts.forEach(p => playerIds.add(p.playerId))
    
    const postsWithComments = await Promise.all(posts.map(async post => {
      const commentsRes = await db.collection('comments')
        .where({ postId: post._id })
        .orderBy('createdAt', 'asc')
        .get()
      
      commentsRes.data.forEach(c => playerIds.add(c.playerId))
      
      return {
        ...post,
        comments: commentsRes.data
      }
    }))

    // 批量获取球员昵称
    const playerIdList = Array.from(playerIds).filter(Boolean)
    let playerMap = {}
    if (playerIdList.length > 0) {
      const playersRes = await db.collection('players')
        .where({ _id: db.command.in(playerIdList) })
        .get()
      playersRes.data.forEach(p => { playerMap[p._id] = p.nickname || p.name || '未知' })
    }

    // 将 cloud:// 图片路径转换为 HTTP URL
    const cloudFileIds = postsWithComments
      .filter(p => p.imageUrl && p.imageUrl.startsWith('cloud://'))
      .map(p => p.imageUrl)
    
    let fileUrlMap = {}
    if (cloudFileIds.length > 0) {
      try {
        const fileListRes = await cloud.getTempFileURL({
          fileList: cloudFileIds
        })
        fileListRes.fileList.forEach(f => {
          fileUrlMap[f.fileID] = f.tempFileURL
        })
      } catch (e) {
        console.error('获取临时文件URL失败:', e)
      }
    }

    // 补充 playerName 和 imageUrl
    const enrichedPosts = postsWithComments.map(post => ({
      ...post,
      playerName: playerMap[post.playerId] || '未知',
      imageUrl: fileUrlMap[post.imageUrl] || post.imageUrl,
      comments: (post.comments || []).map(c => ({
        ...c,
        playerName: playerMap[c.playerId] || '未知'
      }))
    }))

    return {
      success: true,
      posts: enrichedPosts
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
