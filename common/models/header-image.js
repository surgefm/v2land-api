'use strict'

module.exports = function (HeaderImage) {
  let url = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)

  HeaderImage.validatesFormatOf('sourceUrl', {
    allowNull: true,
    allowBlank: true,
    with: url,
    message: '来源链接错误'
  })
}
