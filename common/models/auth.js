'use strict'

const config = require('../../config')
const Step = require('step')
const oauth = config.oauth
const queryString = require('query-string')
const axios = require('axios')

const tokenUrl = {
  twitter: 'https://twitter.com/oauth/authenticate?oauth_token='
}

module.exports = function (Auth) {
  Auth.unauthorize = (options, body, cb) => {
    let site = body.site
    let profileId = body.profileId
    if (!site && !profileId) return cb(new Error('信息不齐全'))
    let Client = Auth.app.models.Client
    let Subscription = Auth.app.models.Subscription
    if (!options.accessToken) return cb(new Error('请先登录'))
    if (!options.accessToken.userId) return cb(new Error('请先登录'))
    let clientId = options.accessToken.userId
    let _client
    let _auth
    let isClientHavingEmail = false

    Step(
      function () {
        Client.findById(clientId, this)
      },
      function (err, client) {
        if (err) cb(err)
        else if (!client) cb(new Error('找不到用户'))
        else {
          _client = client
          if (!_client.email.includes('.langchao.co') &&
            _client.emailVerified) {
            isClientHavingEmail = true
          }
          _client.auths(this)
        }
      },
      function (err, auths) {
        if (err) cb(err)
        else if (auths.length < 2 && !isClientHavingEmail) {
          cb(new Error('你需要至少验证一个邮箱或者有多个绑定账号才可解绑'))
        } else {
          Auth.findOne({ where: {
            site,
            profileId
          } }, this)
        }
      },
      function (err, auth) {
        if (err) cb(err)
        else if (!auth) cb(new Error('找不到该绑定'))
        else {
          console.log(auth)
          _auth = auth
          Subscription.find({ where: {
            subscriberId: _client.id,
            status: 'active'
          } }, this)
        }
      },
      function (err, subscriptions) {
        if (err) cb(err)
        else {
          let group = this.group()
          for (let subscription of subscriptions) {
            if (subscription.contact.address === profileId) {
              console.log(subscription)
              subscription.updateAttributes({
                status: 'unsubscribed'
              }, group())
            }
          }
        }
      },
      function (err, subscriptions) {
        if (err) cb(err)
        else {
          Auth.destroyById(_auth.id, this)
        }
      },
      function (err, m) {
        cb(err, '解绑成功')
      }
    )
  }

  Auth.remoteMethod(
    'unauthorize', {
      http: { path: '/unauthorize', verb: 'post' },
      accepts: [
        { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        { arg: 'body', type: 'any', required: true, http: { source: 'body' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )

  Auth.twitter = (options, redirect, res, cb) => {
    let _token
    let oa = oauth.twitter

    try {
      Step(
        function () {
          oa.getOAuthRequestToken(this)
        },
        function (err, token, tokenSecret, result) {
          if (err) throw err
          _token = token
          Auth.create({
            site: 'twitter',
            token,
            tokenSecret,
            clientId: (options.accessToken || {}).userId,
            redirect
          }, this)
        },
        function (err) {
          if (err) throw err
          res.redirect(307, tokenUrl.twitter + _token)
        }
      )
    } catch (err) { cb(err) }
  }

  Auth.remoteMethod(
    'twitter', {
      http: { path: '/twitter', verb: 'get' },
      accepts: [
        { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        { arg: 'redirect', type: 'string', http: { source: 'query' } },
        { arg: 'res', type: 'object', http: { source: 'res' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )

  Auth.twitterCallback = (token, secret, verifier, res, cb) => {
    let _auth
    let oa = oauth.twitter

    if (!token) {
      return res.redirect(307, config.siteUrl)
    }

    try {
      Step(
        function () {
          Auth.findOne({ where: { token } }, this)
        },
        function (err, auth) {
          if (err) throw err
          if (!auth) {
            cb(null, '未找到绑定信息')
          } else {
            _auth = auth
            oa.getOAuthAccessToken(
              token,
              auth.tokenSecret,
              verifier,
              this
            )
          }
        },
        function (err, accessToken, accessTokenSecret, result) {
          if (err) throw err
          res.send('<script>window.location="' + config.api +
            'auth/twitter/redirect?accessToken=' + accessToken +
            '&accessTokenSecret=' + accessTokenSecret +
            '&authId=' + _auth.id +
            '"</script>'
          )
        }
      )
    } catch (err) { cb(err) }
  }

  Auth.remoteMethod(
    'twitterCallback', {
      http: { path: '/twitter/callback', verb: 'get' },
      accepts: [
        { arg: 'oauth_token', type: 'string', http: { source: 'query' } },
        { arg: 'oauth_token_secret', type: 'string', http: { source: 'query' } },
        { arg: 'oauth_verifier', type: 'string', http: { source: 'query' } },
        { arg: 'res', type: 'object', http: { source: 'res' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )

  Auth.twitterRedirect = (accessToken, accessTokenSecret, authId, res, cb) => {
    let _client
    let _auth
    let __auth
    let Client = Auth.app.models.Client
    let oa = oauth.twitter

    try {
      Step(
        function () {
          Auth.findById(authId, this)
        },
        function (err, auth) {
          if (err) throw err
          _auth = auth
          _auth.accessToken = accessToken
          _auth.accessTokenSecret = accessTokenSecret
          oa.get('https://api.twitter.com/1.1/account/verify_credentials.json',
            accessToken, accessTokenSecret, this)
        },
        function (err, response, result) {
          if (err) throw err
          response = JSON.parse(response)
          _auth.profileId = response.id_str
          _auth.profile = response
          Auth.findOne({ where: {
            site: 'twitter',
            profileId: response.id_str
          } }, this)
        },
        function (err, auth) {
          if (err) throw err
          if (auth) {
            let copy = {
              token: _auth.token,
              tokenSecret: _auth.tokenSecret,
              redirect: _auth.redirect,
              accessToken: _auth.accessToken,
              accessTokenSecret: _auth.accessTokenSecret,
              profile: _auth.profile,
              clientId: _auth.clientId
            }
            let group = this.group()
            auth.updateAttributes(copy, group())
            _auth.destroy(group())
            __auth = auth
          } else {
            _auth.save(this)
            __auth = _auth
          }
        },
        function (err) {
          if (err) throw err
          Client.findOrCreate({ where: {
            or: [
              { id: __auth.clientId || Date.now() },
              { username: 'twitter:' + __auth.profileId }
            ]
          } }, {
            username: 'twitter:' + _auth.profileId,
            password: _auth.accessTokenSecret,
            email: _auth.profileId + '@twitter.langchao.co',
            emailVerified: true
          }, this)
        },
        function (err, client) {
          if (err) throw err
          if (client) {
            _client = client
            __auth.updateAttribute('clientId', _client.id, this)
          } else {
            cb(new Error('找不到绑定用户'))
          }
        },
        function (err) {
          if (err) cb(err)
          else {
            _client.accessTokens.create({
              created: new Date(),
              ttl: 1209600,
              userId: _client.id
            }, this)
          }
        },
        function (err, token) {
          if (err) throw err
          let url = config.siteUrl + (_auth.redirect || '')
          if (!url.includes('?')) {
            url += '?'
          }
          url += '&method=twitter'
          url += '&twitter_id=' + _auth.profileId
          url += '&access_token=' + token.id
          res.redirect(307, url)
        }
      )
    } catch (err) { cb(err) }
  }

  Auth.remoteMethod(
    'twitterRedirect', {
      http: { path: '/twitter/redirect', verb: 'get' },
      accepts: [
        { arg: 'accessToken', type: 'string', http: { source: 'query' } },
        { arg: 'accessTokenSecret', type: 'string', http: { source: 'query' } },
        { arg: 'authId', type: 'string', http: { source: 'query' } },
        { arg: 'res', type: 'object', http: { source: 'res' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )

  Auth.weibo = (options, redirect, res, cb) => {
    let oa = oauth.weibo
    let data = {}
    if (redirect) {
      data.redirect = redirect
    }
    if (options.accessToken) {
      data.clientId = options.accessToken.userId
    }

    let callback = 'https://a.langchao.co/auth/weibo/callback'

    res.redirect(307, oa.getAuthorizeUrl({
      redirect_uri: callback,
      state: queryString.stringify(data)
    }))
  }

  Auth.remoteMethod(
    'weibo', {
      http: { path: '/weibo', verb: 'get' },
      accepts: [
        { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        { arg: 'redirect', type: 'string', http: { source: 'query' } },
        { arg: 'res', type: 'object', http: { source: 'res' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )

  Auth.weiboCallback = (code, state, res, cb) => {
    let oa = oauth.weibo
    let clientId = queryString.parse(state).clientId
    let _redirect = queryString.parse(state).redirect

    if (!code) {
      return res.redirect(307, config.siteUrl)
    }

    Step(
      function () {
        oa.getOAuthAccessToken(
          code,
          {
            'redirect_uri': 'https://a.langchao.co/auth/weibo/callback',
            'grant_type': 'authorization_code'
          },
          this
        )
      },
      function (err, accessToken, refreshToken, result) {
        if (err) cb(err)
        else {
          res.send('<script>window.location="' + config.api +
            'auth/weibo/redirect?accessToken=' + accessToken +
            '&refreshToken=' + refreshToken +
            '&clientId=' + clientId +
            '&redirect=' + _redirect +
            '"</script>'
          )
        }
      }
    )
  }

  Auth.remoteMethod(
    'weiboCallback', {
      http: { path: '/weibo/callback', verb: 'get' },
      accepts: [
        { arg: 'code', type: 'string', http: { source: 'query' } },
        { arg: 'state', type: 'string', http: { source: 'query' } },
        { arg: 'res', type: 'object', http: { source: 'res' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )

  Auth.weiboRedirect = (accessToken, refreshToken, clientId, redirect, res, cb) => {
    let Client = Auth.app.models.Client
    let _auth = {
      site: 'weibo',
      clientId
    }
    let __auth
    let _client

    Step(
      function () {
        _auth.accessToken = accessToken
        axios.post(
          'https://api.weibo.com/oauth2/get_token_info?access_token=' + _auth.accessToken,
          { access_token: _auth.accessToken }
        )
          .then(resp => {
            this(null, resp)
          })
          .catch(err => {
            cb(err)
          })
      },
      function (err, resp) {
        if (err) cb(err)
        else {
          _auth.profileId = resp.data.uid
          let query = {
            access_token: _auth.accessToken,
            uid: _auth.profileId
          }
          query = queryString.stringify(query)
          axios.get(
            'https://api.weibo.com/2/users/show.json?' + query,
            this
          )
            .then(resp => {
              this(null, resp)
            })
            .catch(err => {
              cb(err)
            })
        }
      },
      function (err, resp) {
        if (err) cb(err)
        else {
          _auth.profile = resp.data
          Auth.findOne({ where: {
            site: 'weibo',
            profileId: _auth.profileId
          } }, this)
        }
      },
      function (err, auth) {
        if (err) cb(err)
        else {
          if (auth) {
            auth.updateAttributes(_auth, this)
          } else {
            Auth.create(_auth, this)
          }
        }
      },
      function (err, auth) {
        if (err) cb(err)
        else {
          __auth = auth
          Client.findOrCreate({ where: {
            or: [
              { id: __auth.clientId || Date.now() },
              { username: 'weibo:' + __auth.profileId }
            ]
          } }, {
            username: 'weibo:' + __auth.profileId,
            password: __auth.accessToken,
            email: __auth.profileId + '@weibo.langchao.co',
            emailVerified: true
          }, this)
        }
      },
      function (err, client) {
        if (err) cb(err)
        else {
          _client = client
          __auth.updateAttribute('clientId', _client.id, this)
        }
      },
      function (err) {
        if (err) cb(err)
        else {
          _client.accessTokens.create({
            created: new Date(),
            ttl: 1209600,
            userId: _client.id
          }, this)
        }
      },
      function (err, token) {
        if (err) cb(err)
        else {
          let url = config.siteUrl + (redirect || '')
          if (!url.includes('?')) {
            url += '?'
          }
          url += '&method=weibo'
          url += '&weibo_id=' + _auth.profileId
          url += '&access_token=' + token.id
          res.redirect(307, url)
        }
      }
    )
  }

  Auth.remoteMethod(
    'weiboRedirect', {
      http: { path: '/weibo/redirect', verb: 'get' },
      accepts: [
        { arg: 'accessToken', type: 'string', http: { source: 'query' } },
        { arg: 'refreshToken', type: 'string', http: { source: 'query' } },
        { arg: 'clientId', type: 'string', http: { source: 'query' } },
        { arg: 'redirect', type: 'string', http: { source: 'query' } },
        { arg: 'res', type: 'object', http: { source: 'res' } }
      ],
      returns: { arg: 'message', type: 'string' }
    }
  )
}
