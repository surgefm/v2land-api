'use strict'

const formidable = require('formidable')
const stringHash = require('string-hash')

module.exports = function (Upload) {
  Upload.uploadFile = function (req, res, body, cb) {
    const { bucket } = Upload.app.dataSources.storage.settings

    const form = new formidable.IncomingForm()
    Upload.upload(req, res, {
      container: bucket,
      getFilename: (fileInfo, req, res) => {
        let filename = fileInfo.name
        let parts = filename.split('.')
        let extension = parts[parts.length - 1]
        let newFilename = stringHash(Date.now() + filename) + '.' + extension
        return newFilename
      }
    }, (err, fileObj) => {
      if (err) {
        cb(err)
      } else {
        const fileInfo = fileObj.files.file[0]
        cb(err, fileInfo.providerResponse)
      }
    })
  }

  Upload.remoteMethod('uploadFile', {
    description: 'Uploads a file',
    accepts: [
      { arg: 'req', type: 'object', http: { source: 'req' } },
      { arg: 'res', type: 'object', http: { source: 'res' } },
      { arg: 'body', type: 'object', http: { source: 'body' } }
    ],
    returns: {
      arg: 'file', type: 'object', root: true
    },
    http: { verb: 'post', path: '/' }
  })
}
