'use strict'

const Step = require('step')
const transporter = require('../../server/email')
const qs = require('querystring')
const config = require('../../config')

module.exports = (Client) => {
  Client.settings.acls = require('./client.acl')

  Client.detail = (options, cb) => {
    let _client
    let RoleMapping = Client.app.models.RoleMapping
    let Role = Client.app.models.Role
    let Event = Client.app.models.Event

    Step(
      function () {
        Client.findOne({ where: { _id: options.accessToken.userId } }, this)
      },
      function (err, client) {
        if (err) cb(err)
        _client = client
        RoleMapping.findOne({ where: { principalId: _client.id } }, this)
      },
      function (err, roleMapping) {
        if (err) cb(err)
        if (roleMapping) {
          Role.findById(roleMapping.roleId, this)
        } else {
          this(null, { name: 'guest' })
        }
      },
      function (err, role) {
        if (err) cb(err)
        _client.role = role.name
        _client.subscriptions({
          order: 'id desc',
          where: { status: 'active' }
        }, this)
      },
      function (err, subscriptions) {
        if (err) cb(err)
        let group = this.group()
        for (let i = 0; i < subscriptions.length; i++) {
          let token = group()
          Event.findById(subscriptions[i].eventId, (err, event) => {
            if (err) token(err)
            else {
              if (event) {
                subscriptions[i].eventName = event.name
              }
              token(null, subscriptions[i])
            }
          })
        }
      },
      function (err, subscriptions) {
        if (err) cb(err)
        else {
          _client.subscriptionList = subscriptions
          _client.events({}, this)
        }
      },
      function (err, events) {
        if (err) cb(err)
        else {
          _client.eventList = events
          _client.auths({ fields: {
            profileId: true,
            site: true,
            profile: true
          } }, this)
        }
      },
      function (err, auths) {
        if (err) cb(err)
        else {
          _client.authList = auths
          cb(null, _client)
        }
      }
    )
  }

  Client.remoteMethod(
    'detail', {
      http: { path: '/detail', verb: 'get' },
      accepts: [
        { arg: 'options', type: 'object', http: 'optionsFromRequest' }
      ],
      returns: { arg: 'detail', type: 'object' }
    }
  )

  Client.role = (id, role, cb) => {
    let _client
    let Role = Client.app.models.Role
    let RoleMapping = Client.app.models.RoleMapping

    Step(
      function () {
        Client.findOne({ where: {
          or: [
            { _id: id },
            { username: id }
          ]
        } }, this)
      },
      function (err, client) {
        if (err) cb(err)
        _client = client
        Role.findOne({ where: { name: role } }, this)
      },
      function (err, role) {
        if (err) cb(err)
        role.principals.create({
          principalType: RoleMapping.USER,
          principalId: _client.id,
          roleId: role.id
        }, this)
      },
      function (err) {
        cb(err, '修改成功，已将用户 ' + _client.username + ' 的用户组设为 ' + role)
      }
    )
  }

  Client.remoteMethod(
    'role', {
      http: { path: '/:id/role', verb: 'post' },
      accepts: [
        { arg: 'id', type: 'string' },
        { arg: 'role', type: 'string', required: true, http: { source: 'body' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )

  Client.logoutClient = (options, cb) => {
    if (options.accessToken) {
      Client.logout(options.accessToken.id, cb)
    } else {
      cb(null, '你未登录')
    }
  }

  Client.remoteMethod(
    'logoutClient', {
      http: { path: '/logout', verb: 'get' },
      accepts: [
        { arg: 'options', type: 'object', http: 'optionsFromRequest' }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )

  Client.afterRemote('create', function (context, client, cb) {
    let tokenGenerator = Client.generateVerificationToken

    Step(
      function () {
        tokenGenerator(client, null, this)
      },
      function (err, token) {
        if (err) return cb(err)
        client.verificationToken = token
        client.save(this)
      },
      function (err) {
        if (err) return cb(err)
        let email = {
          to: client.email,
          from: {
            name: '浪潮',
            address: 'verify@langchao.co'
          },
          template: 'registration',
          subject: client.username + '，请完成浪潮注册过程',
          context: {
            username: client.username,
            url: config.api + 'clients/confirm?' +
              qs.stringify({
                uid: '' + client.id,
                redirect: config.api + 'clients/verified',
                token: client.verificationToken
              })
          }
        }

        transporter.on('idle', () => {
          transporter.sendMail(email, cb)
        })
      }
    )
  })
}
