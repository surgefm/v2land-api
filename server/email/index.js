const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const aws = require('aws-sdk')

let transporter = nodemailer.createTransport({
  SES: new aws.SES({
    apiVersion: '2010-12-01'
  }),
  sendingRate: 14,
  host: 'email-smtp.us-east-1.amazonaws.com',
  auth: {
    user: process.env.EMAIL_USER || 'AKIAI3D3RRF7KP4JJNOQ',
    pass: process.env.EMAIL_PWD || ''
  }
})

transporter.use('compile', hbs({
  viewEngine: 'handlebars',
  viewPath: __dirname
}))

module.exports = transporter
