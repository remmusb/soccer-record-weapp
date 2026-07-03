const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { postId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const postRes = await db.collection('posts').doc(postId).get()
    const post = postRes.data

    const adminRes = await db.collection('admins')
      .where({ _openid: openid })
      .get()
    const isAdmin = adminRes.data.length > 0

    const playerRes = await db.collection('players')
      .where({ _openid: openid })
      .get()
    let isCreator = false
    if (playerRes.data.length > 0) {
      isCreator = post.playerId === playerRes.data[0]._id
    }

    if (!isAdmin && !isCreator) {
      return {
        success: false,
        error: '无权限删除'
      }
    }

    await db.collection('posts').doc(postId).remove()

    const commentsRes = await db.collection('comments')
      .where({ postId })
      .get()

    const deleteTasks = commentsRes.data.map(comment => {
      return db.collection('comments').doc(comment._id).remove()
    })

    await Promise.all(deleteTasks)

    return {
      success: true
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
