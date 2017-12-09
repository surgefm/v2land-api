const Step = require('step')
const transporter = require('../email')
const config = require('../../config')
const ModeCollection = require('../../common/models/notification.mode')
const request = require('superagent')
const $ = require('postman-url-encoder')
let Mode
let Auth

module.exports = (app) => {
  let Notification = app.models.Notification
  Auth = app.models.Auth
  Mode = ModeCollection(Notification)
  check(Notification)
}

function check (Notification) {
  Step(
    function () {
      Notification.findOne({ order: 'time asc' }, this)
    },
    function (err, notification) {
      if (err) console.log(err)
      if (notification && (notification.time - Date.now() < 0)) {
        notify(notification, (err) => {
          if (err) console.log(err)
          check(Notification)
        })
      } else {
        setTimeout(() => { check(Notification) }, 1000)
      }
    }
  )
}

function notify (notification, cb) {
  let _event
  let _news
  let _subscriptions

  Step(
    function () {
      notification.event(this)
    },
    function (err, event) {
      if (err || !event) {
        cb(err)
      } else {
        _event = event
        _event.news.findOne({ where: { status: 'admitted' }, order: 'time desc' }, this)
      }
    },
    function (err, news) {
      if (err) {
        cb(err)
      } else {
        _news = news
        notification.subscriptions(this)
      }
    },
    function (err, subscriptions) {
      if (err) {
        cb(err)
      } else {
        _subscriptions = subscriptions
        Mode[notification.mode].getTemplate(notification, _event, _news, this)
      }
    },
    function (err, template) {
      if (err) {
        cb(err)
      } else {
        let group = this.group()
        for (let subscription of _subscriptions) {
          let token = group()
          Step(
            function () {
              if (subscription.record &&
                subscription.record[Math.floor(notification.time.getTime() / 10000)]) {
                token()
              } else {
                switch (subscription.contact.method) {
                  case 'email':
                    notifyByEmail(subscription, template, this)
                    break
                  case 'twitter':
                    notifyByTwitter(subscription, template, this)
                    break
                  case 'twitterAt':
                    notifyByTwitterAt(subscription, template, this)
                    break
                  case 'weibo':
                    notifyByWeibo(subscription, template, this)
                    break
                  case 'weiboAt':
                    notifyByWeiboAt(subscription, template, this)
                    break
                  default:
                    token()
                }
              }
            },
            function (err) {
              if (err) token(err)
              else {
                subscription.record = subscription.record || {}
                subscription.record[Math.floor(notification.time.getTime() / 10000)] = true
                subscription.save(token)
              }
            }
          )
        }
      }
    },
    function (err) {
      if (err) console.log(err)
      Mode[notification.mode].notified(this)
    },
    function (err, time) {
      if (err) {
        cb(err)
      } else {
        notification.updateAttribute('time', time, cb)
      }
    }
  )
}

function notifyByEmail (subscription, template, cb) {
  let email = {
    from: {
      name: '浪潮',
      address: 'notify@langchao.co'
    },
    subject: template.subject,
    template: 'notification',
    context: template
  }
  let send = () => {
    if (transporter.isIdle) {
      email.to = subscription.contact.address
      email.context.unsubscribe = `${config.api}subscriptions/unsubscribe?id=${subscription.unsubscribeId}`
      transporter.sendMail(email, cb)
    } else {
      setTimeout(send, 500)
    }
  }
  send()
}

function notifyByTwitter (subscription, template, cb) {
  let _auth
  let oauth = config.oauth.twitter
  try {
    Step(
      function () {
        Auth.findOne({ where: {
          site: 'twitter',
          profileId: subscription.contact.address
        } }, this)
      },
      function (err, auth) {
        if (err) cb(err)
        if (!auth) cb(new Error('Auth not found.'))
        _auth = auth
        let message = template.message
        message += template.url + ' #浪潮'
        oauth.post('https://api.twitter.com/1.1/statuses/update.json',
          _auth.accessToken, _auth.accessTokenSecret, { status: message }, cb)
      }
    )
  } catch (err) { console.log(err) }
}

function notifyByTwitterAt (subscription, template, cb) {
  let _auth
  let oauth = config.oauth.twitter
  try {
    Step(
      function () {
        Auth.findOne({
          where: {
            site: 'twitter',
            profileId: config.officialAccount.twitter
          }
        }, this)
      },
      function (err, auth) {
        if (err) cb(err)
        if (!auth) cb(new Error('Auth not found.'))
        _auth = auth
        let message = '@' + subscription.contact.address + ' '
        message += template.message
        message += template.url + ' #浪潮'
        oauth.post('https://api.twitter.com/1.1/statuses/update.json',
          _auth.accessToken, _auth.accessTokenSecret, {
            status: message
          }, cb)
      }
    )
  } catch (err) { console.log(err) }
}

function notifyByWeibo (subscription, template, cb) {
  let _auth

  try {
    Step(
      function () {
        Auth.findOne({
          where: {
            site: 'weibo',
            profileId: subscription.contact.address
          }
        }, this)
      },
      function (err, auth) {
        if (err) cb(err)
        if (!auth) cb(new Error('Auth not found.'))
        _auth = auth
        let message = template.message
        message += template.url
        request
          .post('https://api.weibo.com/2/statuses/share.json?' +
            'access_token=' + _auth.accessToken +
            '&status=' + $.encode(message)
          )
          .type('form')
          .end(cb)
      }
    )
  } catch (err) { console.log(err) }
}

function notifyByWeiboAt (subscription, template, cb) {
  let _auth

  try {
    Step(
      function () {
        Auth.findOne({
          where: {
            site: 'weibo',
            profileId: config.officialAccount.weibo
          }
        }, this)
      },
      function (err, auth) {
        if (err) cb(err)
        if (!auth) cb(new Error('Auth not found.'))
        _auth = auth
        let message = '@' + subscription.contact.address + ' '
        message += template.message
        message += ' ' + Math.floor(Math.random() * 10000000) + ' '
        message += template.url
        request
          .post('https://api.weibo.com/2/statuses/share.json?' +
            'access_token=' + _auth.accessToken +
            '&status=' + $.encode(message)
          )
          .type('form')
          .end(cb)
      }
    )
  } catch (err) { console.log(err) }
}
