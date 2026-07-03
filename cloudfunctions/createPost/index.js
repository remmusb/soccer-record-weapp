const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { matchId, imageUrl } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
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

    const res = await db.collection('posts').add({
      data: {
        matchId,
        playerId,
        imageUrl,
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
