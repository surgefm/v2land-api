module.exports = [
  {
    principalType: 'ROLE',
    principalId: '$everyone',
    permission: 'DENY'
  },
  {
    principalType: 'ROLE', // this is the important bit
    principalId: '$owner',
    permission: 'ALLOW'
  },
  {
    principalType: 'ROLE',
    principalId: 'admin',
    permission: 'ALLOW'
  },
  {
    principalType: 'ROLE',
    principalId: '$everyone',
    permission: 'ALLOW',
    property: 'create'
  },
  {
    principalType: 'ROLE',
    principalId: '$owner',
    permission: 'ALLOW',
    property: 'deleteById'
  },
  {
    principalType: 'ROLE',
    principalId: '$everyone',
    permission: 'ALLOW',
    property: 'login'
  },
  {
    principalType: 'ROLE',
    principalId: '$everyone',
    permission: 'ALLOW',
    property: 'logout'
  },
  {
    principalType: 'ROLE',
    principalId: '$owner',
    permission: 'ALLOW',
    property: 'findById'
  },
  {
    principalType: 'ROLE',
    principalId: '$owner',
    permission: 'ALLOW',
    property: 'updateAttributes'
  },
  {
    principalType: 'ROLE',
    principalId: '$everyone',
    permission: 'ALLOW',
    property: 'confirm'
  },
  {
    principalType: 'ROLE',
    principalId: '$authenticated',
    permission: 'ALLOW',
    property: 'detail'
  }
]
