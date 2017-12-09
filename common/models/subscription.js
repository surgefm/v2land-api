'use strict'

const Step = require('step')

module.exports = function (Subscription) {
  Subscription.unsubscribe = (id, cb) => {
    Step(
      function () {
        Subscription.findOne({ where: { unsubscribeId: id } }, this)
      },
      function (err, subscription) {
        if (err) {
          cb(err)
        } else if (!subscription) {
          cb(new Error('未找到该订阅'))
        } else {
          subscription.status = 'unsubscribed'
          subscription.save(this)
        }
      },
      function (err) {
        cb(err, '取消成功')
      }
    )
  }

  Subscription.remoteMethod(
    'unsubscribe', {
      http: { path: '/unsubscribe', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'string', required: true, http: { source: 'query' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )
}
