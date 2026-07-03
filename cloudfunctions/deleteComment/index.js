const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { commentId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const commentRes = await db.collection('comments').doc(commentId).get()
    const comment = commentRes.data

    const adminRes = await db.collection('admins')
      .where({ _openid: openid })
      .get()
    const isAdmin = adminRes.data.length > 0

    const playerRes = await db.collection('players')
      .where({ _openid: openid })
      .get()
    let isCreator = false
    if (playerRes.data.length > 0) {
      isCreator = comment.playerId === playerRes.data[0]._id
    }

    if (!isAdmin && !isCreator) {
      return {
        success: false,
        error: '无权限删除'
      }
    }

    await db.collection('comments').doc(commentId).remove()

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
