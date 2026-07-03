const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { postId, matchId, content } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    try {
      await cloud.openapi.security.msgSecCheck({
        content: content
      })
    } catch (err) {
      if (err.errCode === 87014) {
        return {
          success: false,
          error: '内容含有违规信息'
        }
      }
      throw err
    }

    const playerRes = await db.collection('players')
      .where({ _openid: openid })
      .get()

    if (playerRes.data.length === 0) {
      return {
        success: false,
        error: 'Player not found'
      }
    }

    const playerId = playerRes.data[0]._id

    const res = await db.collection('comments').add({
      data: {
        postId,
        matchId,
        playerId,
        content,
        createdAt: db.serverDate()
      }
    })

    return {
      success: true,
      id: res._id
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
