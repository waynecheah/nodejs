
mongoose = require 'mongoose'
moment   = require 'moment'
commonFn = require '../../lib/common'
log      = require '../../lib/log'
Event    = mongoose.model 'Event'

Events =
  appUpdate: (data, callback) ->
    return
  # END appUpdate

  method: (data, callback) ->
    callback res: data
    return
  # END method
# END Events

module.exports = Events