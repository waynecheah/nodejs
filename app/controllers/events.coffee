
mongoose = require 'mongoose'
moment   = require 'moment'
devices  = require './devices'
commonFn = require '../../lib/common'
log      = require '../../lib/log'
Event    = mongoose.model 'Event'

alarm = (data, callback) ->
  serial = data.ws.devices[0].serial
  type   = data.form.type
  status = data.form.status
  mesg   = "em=#{type},#{status},103"

  obj =
    category: 'emergency',
    log: mesg,
    command: status,
    status: status,
    type: type
    user: 103,
    succeed: false

  devices.write serial, obj, 'tea', (status) ->
    callback
      status: status
      data: data.form

  return
# END alarm


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

  panic: (data, callback) ->
    alarm data, callback
    return
  # END panic

  duress: (data, callback) ->
    alarm data, callback
    return
  # END duress

  method: (data, callback) ->
    callback res: data
    return
  # END method
# END Events

module.exports = Events