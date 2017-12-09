const Step = require('step')
const time = require('time')
const config = require('../../config')

module.exports = (Notification) => ({
  'new': {
    new (event, cb) {
      cb(null, new Date('1/1/3000'))
    },
    update (notification, event, news, cb) {
      if (!news.newNotification) {
        Step(
          function () {
            news.updateAttribute('newNotification', true, this)
          },
          function (err) {
            cb(err, new Date('1/1/2000'))
          }
        )
      } else {
        cb(null, new Date('1/1/3000'))
      }
    },
    notified (cb) {
      cb(null, new Date('1/1/3000'))
    },
    getTemplate (notification, event, news, cb) {
      cb(null, {
        subject: `${event.name} 有了新的消息`,
        message: `${news.source} 发布了关于 ${event.name} 的新消息：「${news.abstract}」`,
        button: '点击按钮查看新闻',
        url: `${config.siteUrl}${event.id}?news=${news.id}`
      })
    }
  },

  '7DaysSinceLatestNews': {
    new (event, cb) {
      let Event = Notification.app.models.Event

      Step(
        function () {
          Event.findById(event, this)
        },
        function (err, result) {
          if (err) throw err
          event = result
          event.news({ where: { status: 'admitted' }, order: 'time desc' }, this)
        },
        function (err, newsCollection) {
          if (err) throw err
          if (newsCollection.length === 0) {
            cb(null, new Date('1/1/3000'))
          } else {
            let date = new time.Date(newsCollection[0].time, 'Asia/Shanghai')
            date.setHours(8)
            date.setMinutes(0)
            date.setSeconds(0)
            date.setDate(date.getDate() + 7)

            cb(null, date - Date.now() < 0 ? new Date('1/1/3000') : date)
          }
        }
      )
    },
    update (notification, event, news, cb) {
      this.new(event.id, cb)
    },
    notified (cb) {
      cb(null, new Date('1/1/3000'))
    },
    getTemplate (notification, event, news, cb) {
      cb(null, {
        subject: `${event.name} 已有七天没有消息`,
        message: `${event.name} 已有七天没有消息，快去看看有什么新的进展。`,
        button: '点击按钮查看事件',
        url: config.siteUrl + event.id
      })
    }
  },

  daily: {
    new (event, cb) {
      let date = new time.Date()

      date.setTimezone('Asia/Shanghai')
      date.setHours(8)
      date.setMinutes(0)
      date.setSeconds(0)
      date.setDate(date.getDate() + 1)

      cb(null, date)
    },
    notified (cb) {
      this.new(null, cb)
    },
    getTemplate (notification, event, news, cb) {
      cb(null, {
        subject: `${event.name} 发来了每日一次的定时提醒`,
        message: `${event.name} 发来了每日一次的定时提醒，快去看看有什么新的进展。`,
        button: '点击按钮查看事件',
        url: config.siteUrl + event.id
      })
    }
  },

  weekly: {
    new (event, cb) {
      let date = new time.Date()

      date.setTimezone('Asia/Shanghai')
      date.setHours(8)
      date.setMinutes(0)
      date.setSeconds(0)
      date.setDate(date.getDate() + 7)

      cb(null, date)
    },
    notified (cb) {
      this.new(null, cb)
    },
    getTemplate (notification, event, news, cb) {
      cb(null, {
        subject: `${event.name} 发来了每周一次的定时提醒`,
        message: `${event.name} 发来了每周一次的定时提醒，快去看看有什么新的进展。`,
        button: '点击按钮查看事件',
        url: config.siteUrl + event.id
      })
    }
  },

  monthly: {
    new (event, cb) {
      let date = new time.Date()

      date.setTimezone('Asia/Shanghai')
      date.setHours(8)
      date.setMinutes(0)
      date.setSeconds(0)
      date.setMonth(date.getMonth() + 1)

      cb(null, date)
    },
    notified (cb) {
      this.new(null, cb)
    },
    getTemplate (notification, event, news, cb) {
      cb(null, {
        subject: `${event.name} 发来了每月一次的定时提醒`,
        message: `${event.name} 发来了每月一次的定时提醒，快去看看有什么新的进展。`,
        button: '点击按钮查看事件',
        url: config.siteUrl + event.id
      })
    }
  }
})
