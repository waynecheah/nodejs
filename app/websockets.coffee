
_           = require 'lodash'
mongoose    = require 'mongoose'
config      = require '../config/config'
controllers = require './controllers'
commonFn    = require '../lib/common'
log         = require '../lib/log'
Device      = mongoose.model 'Device'
Status      = mongoose.model 'Status'
io          = null
sockets     = []

getDeviceInfo = (data, callback) ->
  cond    = users: data.userId
  fields  =
    id: false
    serial: 1

  dbCbFn = (err, docs) ->
    if err
      log 'w', 'e', err
      callback
        status: false
        err: err
      return

    curOnlineDevices = controllers.devices.getSockets()

    _.each docs, (doc, i) ->
      _.each curOnlineDevices, (device) -> # find if user's device is connected to server
        return if 'data' of docs[i] is yes
        docs[i].data = device.data if doc.serial is device.data.info.sn
        return
      return
    _.each docs, (doc, i) ->
      return if 'data' of doc is yes
      cond    = serial: doc.serial
      fields  = 'deviceId info status modified'
      options = sort: modified: -1

      Status.find cond, fields, options, (err, doc) ->
        return
      return

    callback
      status: true
      devices: docs

    return
  # END dbCbFn

  Device.find cond, fields, dbCbFn

  return
# END getDeviceInfo

appUpdate = (type, data, callback) ->
  return
# END appUpdate

emit = (websocket, name, data) ->
  websocket.emit name, data
  return
# END emit


Websockets =
  main: (parent, websocket) ->
    io = parent

    log 'w', 'i', "web socket #{websocket.id} connected"

    websocket.data =
      wsid: websocket.id
      userId: null
      devices: []
      logged: false

    sockets.push websocket # assign websocket to global variable

    websocket.on 'disconnect', () -> # disconnect - io predefined status
      log 'w', 'i', "web client #{websocket.id} has disconnected"

      delete websocket.data

      i = sockets.indexOf socket
      websocket.splice i, 1 if i >= 0
      io.sockets.emit 'UserDisconnected'

      return
    websocket.on 'GET_DEVICE_INFO', (req) -> # once websocket connected to server
      log 'w', 'i', "Proceed event GET_DEVICE_INFO sent from websocket"

      getDeviceInfo req, (res) ->
        emit websocket, 'DeviceInformation', res

      return
    websocket.on 'APP_UPDATE', (type, data) ->
      appUpdate type, data, (err, doc) ->
        # TODO(event): notify app the update is done successfully
        return
      return
    websocket.on 'APP_REQUEST', (req, data) ->
      if req.indexOf('/') >= 0
        routes = req.split '/'
        contrl = routes[0]
        method = if routes.length > 1 then routes[1] else 'index'

        if contrl of controllers is yes and method of controllers[contrl] is yes # controller and method are found
          obj =
            form: data
            ws: socket.data

          controllers[contrl][method] obj, (res, sessions) -> # call execution
            log 's', 'i', "Processed controller [#{contr}] and method [#{method}] has completed"
            socket.emit 'ResponseOnRequest', req, res
            _.assign socket.data, sessions if sessions? and _.isObject sessions
            return

      return

    return
  # END main

  getSockets: () ->
    sockets
  # END getSocket
# END Websockets

module.exports = Websockets