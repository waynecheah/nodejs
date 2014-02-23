
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
  errors  = []
  resData = null
  total   = 0
  noDone  = 0

  dbCbFn = (err, docs) ->
    if err
      log 'w', 'e', err
      callback
        status: false
        error: err
      return

    total   = docs.length
    resData = []
    curOnlineDevices = controllers.devices.getSockets()

    _.each docs, (doc, i) ->
      resData[i] =
        serial: doc.serial
        info: doc
        online: false
      _.each curOnlineDevices, (device) -> # find if user's device is connected to server
        return if 'data' of resData[i] is yes

        if doc.serial is device.data.info.sn
          resData[i] =
            serial: doc.serial
            data: device.data
            online: true
        return
      return

    _.each resData, (doc, i) ->
      dbCbFn2 null, null, i if 'data' of doc is yes

      cond    = serial: doc.serial
      fields  = 'deviceId info status modified'
      options = sort: modified: -1
      Status.findOne cond, fields, options, (err, doc) ->
        dbCbFn2 err, doc, i

      return

    return
  # END dbCbFn

  dbCbFn2 = (err, doc, i) ->
    noDone++

    if err
      log 'w', 'e', err
      errors.push err

      if noDone is total
        callback
          status: false
          errors: errors

      return
    else if doc
      resData[i].data = doc
      delete resData[i].info

    if noDone is total # run callback only when all DB process are done
      callback
        status: true
        devices: resData

    return
  # END dbCbFn2


  cond   = users: data.userID
  fields =
    _id: false
    name: 1
    macAdd: 1
    serial: 1

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

      i = sockets.indexOf websocket
      sockets.splice i, 1 if i >= 0
      io.sockets.emit 'UserDisconnected'

      return
    websocket.on 'GET_DEVICE_INFO', (req) -> # once websocket connected to server
      log 'w', 'i', "Proceed event GET_DEVICE_INFO sent from websocket"

      getDeviceInfo req, (res) ->
        websocket.data.devices = res.devices if res.status and 'devices' of res is yes
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
            ws: websocket.data

          controllers[contrl][method] obj, (res, sessions) -> # call execution
            log 's', 'i', "Processed controller [#{contr}] and method [#{method}] has completed"
            websocket.emit 'ResponseOnRequest', req, res
            _.assign socket.data, sessions if sessions? and _.isObject sessions
            return

      return

    return
  # END main

  socketOnConnected: (deviceId, info) ->
    log 'w', 's', "Device ID #{deviceId} with serial no #{info.sn} has connected to server"

    _.each sockets, (websocket) ->
      _.each websocket.data.devices, (device) ->
        if info.sn is device.serial
          emit websocket, 'Online', serial: info.sn
        return
      return

    return
  # END socketOnconnected

  socketOnClose: (deviceId, info) ->
    log 'w', 'e', "Device ID #{deviceId} with serial no #{info.sn} has disconnected from server"

    _.each sockets, (websocket) ->
      _.each websocket.data.devices, (device) ->
        if info.sn is device.serial
          emit websocket, 'Offline', serial: info.sn
        return
      return

    return
  # END socketOnClose

  socketOnData: (data) ->
    sn  = data.info.sn
    msg = "Device serial no [#{sn}] just connected to server has latest info and status need update to Apps user"
    log 'w', 's', msg

    _.each sockets, (websocket) ->
      _.each websocket.data.devices, (device) ->
        if sn is device.serial
          emit websocket, 'DeviceUpdate',
            serial: sn
            data: data
            online: true
        return
      return

    return
  # END socketOnData

  getSockets: () ->
    sockets
  # END getSocket
# END Websockets

module.exports = Websockets