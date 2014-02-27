
mongoose = require 'mongoose'
moment   = require 'moment'
devices  = require './devices'
commonFn = require '../../lib/common'
log      = require '../../lib/log'
Event    = mongoose.model 'Event'

Events =
  appUpdate: (data, callback) ->
    return
  # END appUpdate

  armDisarmed: (data, callback) ->
    #online = data.ws.devices[0].online
    serial = data.ws.devices[0].serial
    number = data.form.no
    status = data.form.cmd
    passwd = data.form.password
    mesg   = "pt=#{number},#{status},#{passwd}"

    obj =
      category: 'partition',
      log: mesg,
      number: data.form.no,
      command: data.form.cmd,
      value: data.form.password,
      user: 103,
      succeed: false

    devices.write serial, obj, yes, (status) ->
      callback
        status: status
        data: data.form

    return
  # END armDisarmed

  method: (data, callback) ->
    callback res: data
    return
  # END method
# END Events

module.exports = Events