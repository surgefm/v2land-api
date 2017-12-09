let OAuth = require('oauth').OAuth
let OAuth2 = require('oauth').OAuth2

const config = {
  siteUrl: process.env.siteUrl || 'https://langchao.co/',
  api: process.env.api || 'https://a.langchao.co/',
  auth: {
    twitter: {
      key: '',
      secret: ''
    },
    weibo: {
      key: '',
      secret: ''
    }
  },
  officialAccount: {
    twitter: '768458621613072384',
    weibo: '6264484740'
  }
}

const twitterAuth = new OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  config.auth.twitter.key,
  config.auth.twitter.secret,
  '1.0A',
  config.api + '/auth/twitter/callback',
  'HMAC-SHA1'
)

const weiboAuth = new OAuth2(
  config.auth.weibo.key,
  config.auth.weibo.secret,
  'https://api.weibo.com/',
  'oauth2/authorize',
  'oauth2/access_token',
  null
)

const oauth = {
  twitter: twitterAuth,
  weibo: weiboAuth
}

config.oauth = oauth

module.exports = config
