'use strict'

let ModeCollection = require('./notification.mode')
let Step = require('step')

module.exports = function (Notification) {
  Notification.validatesInclusionOf('mode', {
    in: [
      'new',
      '7DaysSinceLatestNews',
      'daily',
      'weekly',
      'monthly'
    ]
  })

  Notification.getNextTime = (mode, event, cb) => {
    let Mode = ModeCollection(Notification)
    Mode[mode].new(event, cb)
  }

  Notification.updateForNewNews = (event, news, cb) => {
    let Mode = ModeCollection(Notification)
    let _news

    Step(
      function () {
        if (typeof news === 'function' && !cb) {
          cb = news
          event.news.findOne({ order: 'time desc' }, this)
        } else {
          _news = news
          this()
        }
      },
      function (err, result) {
        if (err) cb(err)
        _news = result || _news
        event.news.findOne({ order: 'time desc', where: { status: 'admitted' } }, this)
      },
      function (err, latestNews) {
        if (err) cb(err)
        if (!latestNews || (latestNews.id.toString() !== _news.id.toString())) {
          cb()
        } else {
          event.notifications({
            where: { or: [
              { mode: 'new' },
              { mode: '7DaysSinceLatestNews' }
            ] }
          }, this)
        }
      },
      function (err, notificationCollection) {
        if (err) cb(err)
        let group = this.group()
        for (let notification of notificationCollection) {
          Mode[notification.mode].update(notification, event, _news, (err, time) => {
            if (err) cb(err)
            notification.updateAttribute('time', time, group())
          })
        }
      },
      function (err) {
        cb(err)
      }
    )
  }
}
