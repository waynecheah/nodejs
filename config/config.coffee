
_   = require 'lodash'
env = if 'NODE_ENV' of process.env then process.env.NODE_ENV else 'development'

module.exports = _.assign(
  require('./env/all'),
  require('./env/' + env) || {}
)