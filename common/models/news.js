'use strict'

const Step = require('step')

module.exports = function (News) {
  let url = new RegExp(/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/)

  News.patch = (id, data, cb) => {
    let _news
    let Event = News.app.models.Event

    Step(
      function () {
        News.findOne({ where: { id } }, this)
      },
      function (err, news) {
        if (err) {
          cb(err)
        } else {
          _news = news
          news.updateAttributes(data, this)
        }
      },
      function (err) {
        if (err) {
          cb(err)
        } else {
          Event.updateNotification(_news.eventId, cb)
        }
      }
    )
  }

  News.remoteMethod(
    'patch', {
      http: { path: '/:id/edit', verb: 'patch' },
      accepts: [
        { arg: 'id', type: 'string', required: true },
        { arg: 'data', type: 'object', http: { source: 'body' } }
      ],
      returns: { arg: 'news', type: 'object' }
    }
  )

  News.validatesFormatOf('url', {
    with: url,
    message: '新闻链接错误'
  })

  News.validatesLengthOf('abstract', { max: 150 })
  News.validatesDateOf('time')
  News.validatesInclusionOf('status', {
    in: ['pending', 'admitted', 'rejected', 'removed']
  })
}
