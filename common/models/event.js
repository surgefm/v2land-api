'use strict'

const Step = require('step')

module.exports = function (Event) {
  Event.validatesUniquenessOf('name')

  Event.list = (cb) => {
    Event.find({
      where: { status: 'admitted' },
      order: 'id desc',
      fields: {
        id: true,
        name: true,
        description: true
      },
      include: 'header_image',
      limit: 10
    }, cb)
  }

  Event.remoteMethod(
    'list', {
      http: { path: '/latest', verb: 'get' },
      returns: { arg: 'eventCollection', type: 'object' }
    }
  )

  Event.detail = (name, cb) => {
    let _event

    Step(
      function () {
        Event.findOne({ where: { or: [
          { name },
          { _id: name }
        ]} }, this)
      },
      function (err, event) {
        if (err) cb(err)
        if (!event) {
          cb(new Error('未找到该事件'))
        } else {
          _event = event
          _event['header_image'](this)
        }
      },
      function (err, headerImage) {
        if (err) cb(err)
        _event.image = headerImage
        _event.news({ where: { status: 'admitted' }, order: 'time desc' }, this)
      },
      function (err, newsCollection) {
        if (err) cb(err)
        _event.newsCollection = newsCollection
        cb(null, _event)
      }
    )
  }

  Event.remoteMethod(
    'detail', {
      http: { path: '/:name/detail', verb: 'get' },
      accepts: [
        { arg: 'name', type: 'string', required: true }
      ],
      returns: { arg: 'detail', type: 'object' }
    }
  )

  Event.pendingNews = (name, cb) => {
    let _event

    Step(
      function () {
        Event.findOne({ where: { name } }, this)
      },
      function (err, event) {
        if (err || !event) {
          return cb(err)
        } else {
          _event = event
          _event.news({ where: { status: 'pending' } }, cb)
        }
      }
    )
  }

  Event.remoteMethod(
    'pendingNews', {
      http: { path: '/:name/pending_news', verb: 'get' },
      accepts: [
        { arg: 'name', type: 'string', required: true }
      ],
      returns: { arg: 'newsCollection', type: 'object' }
    }
  )

  Event.allPendingNews = (cb) => {
    let News = Event.app.models.News

    News.find({
      where: { status: 'pending' },
      include: 'event'
    }, cb)
  }

  Event.remoteMethod(
    'allPendingNews', {
      http: { path: '/pending_news', verb: 'get' },
      returns: { arg: 'newsCollection', type: 'object' }
    }
  )

  Event.subscribe = (name, data, options, cb) => {
    let _event
    let _client
    let _notification
    let Client = Event.app.models.Client
    let Notification = Event.app.models.Notification
    let Subscription = Event.app.models.Subscription

    Step(
      function () {
        Event.findOne({ where: { name } }, this)
      },
      function (err, event) {
        if (err) cb(err)
        _event = event
        if (options.accessToken) {
          Client.findById(options.accessToken.userId, this)
        } else {
          this()
        }
      },
      function (err, client) {
        if (err) cb(err)
        _client = client
        Notification.getNextTime(data.mode, _event.id, (err, time) => {
          if (err) cb(err)
          Notification.findOrCreate({
            mode: data.mode,
            time,
            eventId: _event.id
          }, this)
        })
      },
      function (err, notification) {
        if (err) cb(err)
        _notification = notification || _notification
        Subscription.findOne({ where: {
          subscriberId: _client ? _client.id : (Date.now() + Math.random()),
          notificationId: _notification.id
        } }, this)
      },
      function (err, subscription) {
        if (err) cb(err)
        if (subscription &&
          subscription.contact.address === data.contact.address &&
          subscription.contact.method === data.contact.method) {
          cb(null, subscription)
        } else {
          let unsubscribeId = _notification.id + _event.id + Date.now()
          Subscription.create({
            notificationId: _notification.id,
            subscriberId: _client ? _client.id : null,
            eventId: _event.id,
            contact: data.contact,
            mode: data.mode,
            unsubscribeId
          }, cb)
        }
      }
    )
  }

  Event.remoteMethod(
    'subscribe', {
      http: { path: '/:name/subscribe', verb: 'post' },
      accepts: [
        { arg: 'name', type: 'string' },
        { arg: 'data', type: 'object', required: true, http: { source: 'body' } },
        { arg: 'options', type: 'object', http: 'optionsFromRequest' }
      ],
      returns: { arg: 'subscription', type: 'object' }
    }
  )

  Event.createHeaderImage = (id, data, cb) => {
    Event.findOne({ where: { name: id } }, (err, event) => {
      if (err) {
        cb(err)
      } else if (!event) {
        cb(new Error('找不到该事件'))
      } else {
        event['__create__header_image'](data, cb)
      }
    })
  }

  Event.remoteMethod(
    'createHeaderImage', {
      http: { path: '/:id/image', verb: 'post' },
      accepts: [
        { arg: 'id', type: 'string', required: true },
        { arg: 'data', type: 'object', http: { source: 'body' } }
      ],
      returns: { arg: 'headerImage', type: 'object' }
    }
  )

  Event.updateHeaderImage = (id, data, cb) => {
    Event.findOne({ where: { name: id } }, (err, event) => {
      if (err) {
        cb(err)
      } else if (!event) {
        cb(new Error('找不到该事件'))
      } else {
        event['__update__header_image'](data, cb)
      }
    })
  }

  Event.remoteMethod(
    'updateHeaderImage', {
      http: { path: '/:id/image', verb: 'patch' },
      accepts: [
        { arg: 'id', type: 'string', required: true },
        { arg: 'data', type: 'object', http: { source: 'body' } }
      ],
      returns: { arg: 'headerImage', type: 'object' }
    }
  )

  Event.createNews = (id, data, cb) => {
    Event.findOne({ where: { name: id } }, (err, event) => {
      if (err) {
        cb(err)
      } else if (!event) {
        cb(new Error('找不到该事件'))
      } else {
        data.status = 'admitted'
        event['__create__news'](data, (err, news) => {
          if (err) {
            cb(err)
          } else {
            Event.updateNotification(event.id, news, cb)
          }
        })
      }
    })
  }

  Event.remoteMethod(
    'createNews', {
      http: { path: '/:id/news', verb: 'put' },
      accepts: [
        { arg: 'id', type: 'string', required: true },
        { arg: 'data', type: 'object', http: { source: 'body' } }
      ],
      returns: { arg: 'news', type: 'object' }
    }
  )

  Event.submitNews = (id, data, cb) => {
    Event.findOne({ where: { name: id } }, (err, event) => {
      if (err) {
        cb(err)
      } else if (!event) {
        cb(new Error('找不到该事件'))
      } else {
        data.status = 'pending'
        event['__create__news'](data, cb)
      }
    })
  }

  Event.remoteMethod(
    'submitNews', {
      http: { path: '/:id/news/add', verb: 'put' },
      accepts: [
        { arg: 'id', type: 'string', required: true },
        { arg: 'data', type: 'object', http: { source: 'body' } }
      ],
      returns: { arg: 'news', type: 'object' }
    }
  )

  Event.updateNotification = (id, news, cb) => {
    let Notification = Event.app.models.Notification
    Step(
      function () {
        Event.findOne({ where: {
          or: [
            { name: id },
            { id }
          ] } }, this)
      },
      function (err, event) {
        if (err) {
          cb(err)
        } else {
          Notification.updateForNewNews(event, news, cb)
        }
      }
    )
  }

  Event.updateEvent = (id, data, cb) => {
    Event.findOne({ where: { name: id } }, (err, event) => {
      if (err) {
        cb(err)
      } else if (!event) {
        cb(new Error('找不到该事件'))
      } else {
        event.updateAttributes(data, (err) => {
          if (err) {
            cb(err)
          } else {
            Event.updateNotification(event.id, cb)
          }
        })
      }
    })
  }

  Event.remoteMethod(
    'updateEvent', {
      http: { path: '/:id', verb: 'put' },
      accepts: [
        { arg: 'id', type: 'string', required: true },
        { arg: 'data', type: 'object', http: { source: 'body' } }
      ],
      returns: { arg: 'event', type: 'object' }
    }
  )

  Event.submitEvent = (event, cb) => {
    event.status = 'pending'
    Event.create(event, cb)
  }

  Event.remoteMethod(
    'submitEvent', {
      http: { path: '/add', verb: 'post' },
      accepts: [
        { arg: 'data', type: 'object', http: { source: 'body' } }
      ],
      returns: { arg: 'event', type: 'object' }
    }
  )
}
