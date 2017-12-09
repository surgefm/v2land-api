const Step = require('step')

module.exports = function (app) {
  let Role = app.models.Role
  let RoleMapping = app.models.RoleMapping
  let Client = app.models.Client
  let _role

  Step(
    function () {
      Role.findOrCreate({ name: 'admin' }, this)
    },
    function (err, role) {
      if (err) throw err
      _role = role
      Client.findOne({ username: 'admin' }, this)
    },
    function (err, client) {
      if (err) throw err
      if (client) {
        this(null, client)
      } else {
        Client.create({
          username: 'admin',
          email: 'admin@langchao.co',
          password: 'abcd1234',
          emailVerified: true
        }, this)
      }
    },
    function (err, client) {
      if (err) throw err
      _role.principals.create({
        principalType: RoleMapping.USER,
        principalId: client.id
      })
    }
  )

  Role.findOrCreate({ name: 'contributor' }, (err) => {
    if (err) throw err
  })
}
