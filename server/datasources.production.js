const env = process.env

module.exports = {
  'db': {
    'name': 'db',
    'connector': 'memory'
  },
  'mongo': {
    'host': env.DB_HOST || '127.0.0.1',
    'port': env.DB_PORT || 27017,
    'url': env.DB_URL || '',
    'database': env.DB_NAME || 'v2land',
    'password': env.DB_PWD || 'abcd1234',
    'name': 'mongo',
    'user': env.DB_USERNAME || 'v2land',
    'connector': 'mongodb'
  },
  'storage': {
    'name': 'storage',
    'connector': 'loopback-component-storage',
    'provider': 'amazon',
    'keyId': env.S3_ID || 'AKIAJK7FS4P64HT3Y4VQ',
    'key': env.S3_KEY,
    'acl': 'public-read',
    'bucket': env.S3_BUCKET || 'langchao-static'
  }
}
