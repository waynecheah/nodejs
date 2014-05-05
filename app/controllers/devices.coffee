
_          = require 'lodash'
mongoose   = require 'mongoose'
moment     = require 'moment'
config     = require '../../config/config'
commonFn   = require '../../lib/common'
log        = require '../../lib/log'
websockets = require '../websockets'
Device     = mongoose.model 'Device'
Event      = mongoose.model 'Event'
Status     = mongoose.model 'Status'
sockets    = []
RN         = '\r\n';

encryption = (socket, data) ->
  str = commonFn.decryption data, config.aesKey, config.aesIv, 'hex'

  commands = str.split ';'
  _.each commands, (cmd) ->
    dataRoutes socket, cmd if cmd
    return

  #dataRoutes socket, str if str
  return
# END encryption

dataRoutes = (socket, data) ->
  stt = ['si','pt','zn','em','dv','li','ss']
  lgt = ['lsi','lpt','lzn','lem','ldv','lli','lss']

  if 'info' of socket.data is false # when device has not logged, all data sent will go here
    # PROCESS OF AUTHORISATION
    getDeviceInfo socket, data
  else if 'status' of socket.data is false # get all current status from device
    # PROCESS OF ALL STATUS UPDATE
    getCurrentStatus socket, data
  else if lgt.indexOf(data.substr 0,3) >= 0 # receive event logs from device
    # EVENT LOG RECEIVED WILL UPDATE SERVER DATABASE
    getEventLogs socket, data
  else if stt.indexOf(data.substr 0,2) >= 0 # receive status update from device
    # SOME STATUS HAS CHANGED ON DEVICE, APP MIGHT NEED TO REFRESH WITH THE UPDATE
    getDeviceUpdate socket, data
  else if commonFn.isc data, 'ok' # device reply 'ok' to confirm it received of previous sent command
    reportedOkay socket
  else # send error to other and don't try to make funny thing to server
    log 'n', 'e', "Client #{socket.id} just sent an invalid input: #{data}"
    socketWrite socket, 'e0'

  return
# END dataRoutes

getDeviceInfo = (socket, data) ->
  socket.tmp = {} if socket.tmp is null

  if ps = commonFn.iss data, 'cn'
    value = commonFn.gv data, ps
    log 'n', 'i', "Receive code name: #{value}"
    socket.tmp.cn = value
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'sn'
    value = commonFn.gv data, ps
    log 'n', 'i', "Received serial: #{value}"
    socket.tmp.sn = value
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'pn'
    value = commonFn.gv data, ps
    log 'n', 'i', "Received product name: #{value}"
    socket.tmp.pn = value
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'vs'
    value = commonFn.gv data, ps
    log 'n', 'i', "Received version: #{value}"
    socket.tmp.vs = value
    socketWrite socket, 'ok'
  else if commonFn.isc data, '-done-'
    t = socket.tmp

    if 'cn' of t is false or 'sn' of t is false or 'pn' of t is false or 'vs' of t is false
      log 'n', 'w', 'Device has not submitted all required authorization data'
      socketWrite socket, 'e3'
      return

    dbFindDevice socket, t, (id) ->
      websockets.socketOnConnected id, t
      return
  else if data
    log 'n', 'e', "Invalid input #{data}"
    socketWrite socket, 'e0'

  return
# END getDeviceInfo

getCurrentStatus = (socket, data) ->
  if ps = commonFn.iss data, 'si' # system info
    str = commonFn.gv data, ps
    key = getKeys str, 'system info', 2

    unless key
      socketWrite socket, 'e5'
      return

    info = getMap 'system', key[0], key[1]
    log 'n', 'i', "Received system info update: #{info}"
    socket.tmp.system.push str
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'pt' # partition status
    str = commonFn.gv data, ps
    key = getKeys str, 'partition status', 3

    unless key
      socketWrite socket, 'e5'
      return

    info = getMap 'partition', key[1], key[2]
    log 'n', 'i', "Received partition status update: Partition #{key[0]} = #{info}"
    socket.tmp.partition.push str
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'zn' # zones status
    str = commonFn.gv data, ps
    key = getKeys str, 'zone status', 5

    unless key
      socketWrite socket, 'e5'
      return

    info = getMap 'zone', key[1], key[2], key[4]
    log 'n', 'i', "Received zone status update: Partition #{key[3]} Zone #{key[0]} = #{info}"
    socket.tmp.zones.push str
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'em' # emergency status
    str = commonFn.gv data, ps
    key = getKeys str, 'emergency status', 3

    unless key
      socketWrite socket, 'e5'
      return

    info = getMap 'emergency', key[0], key[1], key[2]
    log 'n', 'i', "Received emergency status update: #{info}"
    socket.tmp.emergency.push str
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'dv' # device status
    str = commonFn.gv data, ps
    key = getKeys str, 'device status', 5

    unless key
      socketWrite socket, 'e5'
      return

    info = getMap 'light', key[1], key[2], key[3], key[4]
    log 'n', 'i', "Received device status update: Device #{key[0]} = #{info}"
    socket.tmp.devices.push str
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'li' # lights status
    str = commonFn.gv data, ps
    key = getKeys str, 'light status', 5

    unless key
      socketWrite socket, 'e5'
      return

    info = getMap 'light', key[1], key[2], key[3], key[4]
    log 'n', 'i', "Received light status update: Light #{key[0]} = #{info}"
    socket.tmp.lights.push str
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'ss' # sensor status
    str = commonFn.gv data, ps
    key = getKeys str, 'sensor status', 4

    unless key
      socketWrite socket, 'e5'
      return

    info = getMap 'sensor', key[1], key[2], key[3]
    log 'n', 'i', "Received sensor status update: Sensor #{key[0]} = #{info}"
    socket.tmp.sensors.push str
    socketWrite socket, 'ok'
  else if ps = commonFn.iss data, 'lb' # label status
    str = commonFn.gv data, ps
    key = getKeys str, 'label list', 3

    unless key
      socketWrite socket, 'e5'
      return

    info = getMap 'label', key[0], key[1], key[2]
    log 'n', 'i', "Received label update: #{info}"
    socket.tmp.labels.push str
    socketWrite socket, 'ok'
  else if commonFn.isc data, '-done-'
    t = socket.tmp

    if t.system.length < 5
      log 'n', 'w', 'Reported system status found incomplete'
      socketWrite socket, 'e7'
    else if t.partition.length is 0
      log 'n', 'w', 'No any partition status reported'
      socketWrite socket, 'e8'
    else if t.zones.length is 0
      log 'n', 'w', 'No any zone status reported'
      socketWrite socket, 'e9'
    else
      log 'n', 'i', 'All current status have updated successfully'
      socket.data.status = socket.tmp
      socket.tmp         = {}

      dbUpdateLastSync socket, socket.data.info.sn
      dbStatusUpdate socket, ->
        websockets.socketOnData 'initial', socket.data
        return
  else if data
    log 'n', 'e', "Invalid input #{data}"
    socketWrite socket, 'e0'

  return
# END getCurrentStatus

getEventLogs = (socket, data) ->
  cond =
    datetime: null
    device: socket.data.deviceId
    category: null
  event =
    datetime: null
    device: socket.data.deviceId
    category: null
    log: data

  if ps = commonFn.iss data, 'lsi'
    str = commonFn.gv data, ps
    key = getKeys str, 'system info event log', 4

    unless key
      socketWrite socket, 'e5'
      return

    cond.datetime = key[3]
    cond.category = 'system'

    event.datetime = key[3]
    event.category = 'system'
    event.status   = key[1]
    event.type     = key[0]
    event.user     = key[2]

    dbEventUpdate socket, cond, event, 'System Info'
  else if ps = commonFn.iss data, 'lpt'
    str = commonFn.gv data, ps
    key = getKeys str, 'partition event log', 4

    unless key
      socketWrite socket, 'e5'
      return

    cond.datetime = key[3]
    cond.category = 'partition'

    event.datetime = key[3]
    event.category = 'partition'
    event.number   = key[0]
    event.status   = key[1]
    event.user     = key[2]

    dbEventUpdate socket, cond, event, 'Partition'
  else if ps = commonFn.iss data, 'lzn'
    str = commonFn.gv data, ps
    key = getKeys str, 'zone event log', 6

    unless key
      socketWrite socket, 'e5'
      return

    cond.datetime = key[5]
    cond.category = 'zone'

    event.datetime  = key[5]
    event.category  = 'zone'
    event.number    = key[0]
    event.status    = key[2]
    event.partition = key[3]
    event.type      = key[4]

    dbEventUpdate socket, cond, event, 'Zone'
  else if ps = commonFn.iss data, 'lem'
    str = commonFn.gv data, ps
    key = getKeys str, 'emergency event log', 4

    unless key
      socketWrite socket, 'e5'
      return

    cond.datetime = key[3]
    cond.category = 'emergency'

    event.datetime = key[3]
    event.category = 'emergency'
    event.status   = key[1]
    event.type     = key[0]
    event.user     = key[2]

    dbEventUpdate socket, cond, event, 'Emergency'
  else if ps = commonFn.iss data, 'ldv'
    str = commonFn.gv data, ps
    key = getKeys str, 'device event log', 6

    unless key
      socketWrite socket, 'e5'
      return

    cond.datetime = key[5]
    cond.category = 'device'

    event.datetime = key[5]
    event.category = 'device'
    event.number   = key[0]
    event.status   = key[2]
    event.value    = key[3]
    event.type     = key[1]
    event.user     = key[4]

    dbEventUpdate socket, cond, event, 'Device'
  else if data
    # TODO(plan): not sure if there need a -done- when all event logs sent completed
    log 'n', 'e', "Invalid input: #{data}"
    socketWrite socket, 'e0'

  return
# END getEventLogs

getDeviceUpdate = (socket, data) ->
  loopUpdate = (type, key, str) ->
    _.each socket.data.status[type], (s, i) ->
      k = s.split ','

      if key and k[0] is key # make sure update to the same record by using key match
        log 's', 's', "Socket status data '#{type}' has updated to [#{str}]"
        socket.data.status[type][i] = str

        log 'n', 'i', "Server reply 'ok' to device for the status update:- #{data}"
        key = null
        socketWrite socket, 'ok'
        dbStatusUpdate socket, ->
          websockets.socketOnData 'update', socket.data
          return

      return
    # END each loop
    return
  # END loopUpdate

  if ps = commonFn.iss data, 'si'
    str = commonFn.gv data, ps
    key = getKeys str, 'system info update', 2 # raw data, err mesg, minimum length

    unless key
      socketWrite socket, 'e5'
      return

    loopUpdate 'system', key[0], str
  else if ps = commonFn.iss data, 'pt'
    str = commonFn.gv data, ps
    key = getKeys str, 'partition update', 3 # raw data, err mesg, minimum length

    unless key
      socketWrite socket, 'e5'
      return

    loopUpdate 'partition', key[0], str
  else if ps = commonFn.iss data, 'zn'
    str = commonFn.gv data, ps
    key = getKeys str, 'zone update', 5 # raw data, err mesg, minimum length

    unless key
      socketWrite socket, 'e5'
      return

    loopUpdate 'zones', key[0], str
  else if ps = commonFn.iss data, 'em'
    str = commonFn.gv data, ps
    key = getKeys str, 'emergency update', 3 # raw data, err mesg, minimum length

    unless key
      socketWrite socket, 'e5'
      return

    loopUpdate 'emergency', key[0], str
  else if ps = commonFn.iss data, 'li'
    str = commonFn.gv data, ps
    key = getKeys str, 'light update', 5 # raw data, err mesg, minimum length

    unless key
      socketWrite socket, 'e5'
      return

    loopUpdate 'lights', key[0], str
  else if data
    log 'n', 'e', "invalid input: #{data}"
    socketWrite socket, 'e0'
    return

  return
# END getDeviceUpdate

getMap = (category, m1=null, m2=null, m3=null, m4=null) ->
  m = config.mapping

  switch category
    when 'system' then "#{m.system.type[m1]} = #{m.system.status[m2]}"
    when 'partition'
      if m2 of m.partition.user is true
        usr = m.partition.user[m2]
      else
        usr = m2
      "#{m.partition.status[m1]} by user [#{usr}]"
    when 'zone' then "Condition:#{m.zone.condition[m1]} | Status:#{m.zone.status[m2]} | Type:#{m.zone.type[m3]}"
    when 'emergency' then "Type:#{m.emergency.type[m1]} | Status:#{m.emergency.status[m2]} | User:#{m3}"
    when 'light'
      val = if m3 then " (#{m3})" else ''

      if m4 of m.light.user is true
        usr = m.light.user[m4]
      else
        usr = m4
      "Type:#{m.light.type[m1]} | Status:#{m.light.status[m2]} | User:#{usr}"
    when 'sensor'
      val = if m3 then " (#{m3})" else ''
      "m.sensor.type[#{m1}] | Status:m.sensor.status[#{m2}]"
    when 'label' then m.label.item[m1]
    else false
# END getMap

confirmSocketActive = (socket) ->
  log 'n', 's', "Clear disconnect action, device socket [#{socket.id}] has response and seems alright in connection"
  clearTimeout socket.data.systemcheck
  delete socket.data.systemcheck
  return
# END confirmSocketActive

reportedOkay = (socket) ->
  return confirmSocketActive socket if 'systemcheck' of socket.data is true

  cmd = socket.app.lastCommand

  if not cmd
    log 'n', 'e', 'Receive ok from hardware, but last command is empty'
  else if cmd of socket.app is false
    log 'n', 'e', "Receive ok from hardware, but last command [#{cmd}] not found in last"
  else if 'eid' of socket.app[cmd] is false or not socket.app[cmd].eid
    log 'n', 'e', "Receive ok from hardware, but last command [#{cmd}] has no event id recorded"
  else
    log 'n', 'i', "Receive ok from hardware, confirm last command [#{cmd}] has received by device"
    socket.app[cmd].status = 'device receive'
    socket.app.lastCommand = null
    dbUpdateAppEvent socket.app[cmd].eid

  return
# END reportedOkay

dbFindDevice = (socket, data, callback) ->
  Device.findOne serial: data.sn, 'id macAdd lastSync', (err, doc) ->
    if err
      log 'n', 'e', err
      log 'n', 'd', data
      socketWrite socket, 'e2'
    else if not doc or 'id' of doc is false # unrecognized serial
      log 'n', 'w', "Device ID [#{socket.id}] made an invalid access. Unrecognized serial #{data.sn}"
      log 'n', 'd', data
      socketWrite socket, 'e4'
    else
      lastSync = if 'lastSync' of doc is true then doc.lastSync else ''

      log 'n', 'i', "Device ID [#{socket.id}] has logged successfully"
      log 'n', 'd', data
      log 'n', 'd', doc

      socket.data =
        deviceId: doc.id
        info: data
        lastSync: lastSync
      socket.tmp = # initialize variable for next coming status update
        system: []
        partition: []
        zones: []
        emergency: []
        devices: []
        lights: []
        sensors: []
        labels: []

      callback doc.id
      socketWrite socket, 'sr?' # ask device's status report
    return
  return
# END

dbUpdateLastSync = (socket, serial, callback) ->
  lastSync = new Date

  Device.findOneAndUpdate serial: serial, lastSync:lastSync, (err) ->
    if err
      log 'n', 'e', err
      socketWrite socket, 'e2'
      return

    datetime = lastSync.toLocaleDateString()+' '+lastSync.toLocaleTimeString()
    log 'n', 'i', "Update database of it last sync date & time: #{datetime}"

    if callback? and _.isFunction callback
      callback()

    return

  return
# END dbUpdateLastSync

dbStatusUpdate = (socket, callback) ->
  cond =
    deviceId: socket.id
    serial: socket.data.info.sn
  update =
    $set:
      info: socket.data.info
      status: socket.data.status
  options =
    upsert: true

  Status.update cond, update, options, (err, updated, rawResponse) ->
    if err
      log 's', 'e', 'Fail update device last status info to DB'
      socketWrite socket, 'e10'
      return

    if rawResponse.updatedExisting
      log 's', 's', "Device last status info has updated to DB successfully. #{updated} document inserted"
    else
      log 's', 's', "Device last status info has inserted to DB successfully. #{updated} document updated"

    log 's', 'd', rawResponse

    if callback? and _.isFunction callback
      callback()

    return

  return
# END dbStatusUpdate

dbEventUpdate = (socket, cond, event, type, callback) ->
  options =
    upsert: true

  Event.findOneAndUpdate cond, event, options, (err, doc) ->
    if err
      log 's', 'e', "#{type} event has logged failure"
      socketWrite socket, 'e6'
      return

    log 's', 's', "#{type} event has logged successfully"
    log 's', 'd', doc

    socketWrite socket, 'ok'
    socket.logs.datetime = cond.datetime
    socket.logs.count   += 1

    if callback? and _.isFunction callback
      callback()

    return

  return
# END dbEventUpdate



dbAddAppEvent = (data, callback) ->
  if not data
    return callback(null, false) if _.isFunction callback

  Event.create data, (err, doc) ->
    if err
      log 's', 'e', 'App event has logged failure'
      log 's', 'd', err
    else
      log 's', 's', 'App event has logged successfully'
      log 's', 'd', doc

    callback(err, doc) if _.isFunction callback

    return
  # END Event.create

  return
# END dbAddAppEvent

dbUpdateAppEvent = (eid) ->
  if not eid?
    return

  cond =
    _id: eid
  update =
    $set:
      succeed: true

  Event.findOneAndUpdate cond, update, (err, doc) ->
    if err
      log 's', 'e', err
      return

    log 's', 's', 'Update App event delivered and execute at hardware side successfully'
    log 's', 'd', doc
    return

  return
# END dbUpdateAppEvent


dataHandler = (socket, data) ->
  data = data.toString()
  info = data.split RN
  end  = false

  _.each info, (dt, i) ->
    return if end
    return if not dt
    debugOnApp socket, dt

    if commonFn.isc dt, 'quit' # device is asking self termination
      end = true
      i   = 0
      socketWrite socket, 'See ya ;)'

      while i < sockets.length
        if sockets[i] is socket
          sockets[i].end()
          i = sockets.length
        i++
    else if commonFn.isc dt, 'debug' # temporary for debug purposes
      i = 0
      log 'n', 'i', "Client id: #{socket.id}"

      while i < sockets.length
        log 'n', 'i', "Socket id: #{sockets[i].id}"
        log 'n', 'd', sockets[i].data
        i++
    else if dt.substr(0,7) is '-hello-' # device is checking if server alive and responding
      log 'n', 'i', "#{socket.id} says hello"
      socketWrite socket, 'ok'
    else if not socket.tmp and not commonFn.iss dt, 'cn'
      log 'n', 'i', 'Probably this is welcome message sent from device when initial connect'
      log 'n', 'd', dt
      socket.tmp =
        welcome: dt
    else if ps = commonFn.iss dt, 'en'
      encryption socket, commonFn.gv dt, ps
    else
      commands = dt.split ';'
      _.each commands, (cmd) ->
        dataRoutes socket, cmd if cmd
        return

    return
  # END each loop

  return
# END dataHandler

debugOnApp = (socket, raw) ->
    data = {}

    if ps = commonFn.iss raw, 'en'
      encr = commonFn.gv raw, ps
      decr = commonFn.decryption encr, config.aesKey, config.aesIv, 'hex'
      data =
        encrypted: raw
        text: decr
    else
      data.text = raw

    if 'data' of socket is true and 'info' of socket.data is true and 'sn' of socket.data.info is true
      serial = socket.data.info.sn;
    else
      serial = null

    websockets.socketOnDebug serial, data
    return
# END debugOnApp

getKeys = (str, err, length) ->
  key = str.split ','

  if key.length isnt length
    log 'n', 'e', "Invalid #{err}, improper format sent"
    return false

  key
# END getKeys

socketWrite = (socket, msg) ->
  socket.write msg+RN
  return
# END socketWrite


Devices =
  main: (socket) ->
    socket.id   = socket._handle.fd
    socket.app  = {}
    socket.data = {}
    socket.tmp  = null
    socket.logs =
      count: 0

    log 'n', 'i', "Client #{socket.id} connected"
    sockets.push socket # assign socket to global variable
    socket.setKeepAlive true, 90000
    socketWrite socket, 'id?'

    socket.on 'data', (data) ->
      dataHandler socket, data
      return
    socket.on 'end', () ->
      log 'n', 'i', "Client #{socket.id} has sent FIN packet to close connection, host acknowledge by send back FIN"
      return
    socket.on 'timeout', () ->
      log 'n', 'w', "Client #{socket.id} has times out from inactivity"
      # TODO(system): manually close the connection
      return
    socket.on 'error', (err) ->
      log 'n', 'i', "The connection for client #{socket.id} has an error occur"
      log 'n', 'd', err
      return
    socket.on 'close', (hasErr) ->
      msg = if hasErr then 'Error occur before connection closed' else 'No error was found'
      log 'n', 'i', "Check if client #{socket.id} has disconnected. #{msg}"

      fnCloseSocket = ->
        log 'n', 'w', 'Device socket confirm closed, notify App user who connect to it'
        websockets.socketOnClose socket.data.deviceId, socket.data.info
        delete socket.data

        i = sockets.indexOf socket
        sockets.splice i, 1 if i >= 0

        return
      # END fnCloseSocket

      socket.data.systemcheck = setTimeout fnCloseSocket, 5000
      socketWrite socket, 'sc?'

      return

    socket
  # END main

  getSockets: ->
    sockets
  # END getSocket

  write: (serial, data, encrption, callback) ->
    total = sockets.length
    time  = (new Date).getTime()
    sent  = no
    i     = 0

    data.datetime = time

    if encrption
      msg = commonFn.encryption data.log, config.aesKey, config.aesIv, 'hex'
      return if not msg
      msg = "en=#{msg}"
    else
      msg = data.log

    while i < total
      socket = sockets[i]
      sn     = socket.data.info.sn

      if serial is sn
        log 'w', 'i', "App make update to device serial [#{sn}] with command [#{msg}]"
        socketWrite socket, msg

        data.device = socket.data.deviceId
        dbAddAppEvent data, (err, doc) ->
          return if err

          socket.app.lastCommand    = data.category
          socket.app[data.category] =
            status: 'server sent'
            eid: doc._id
            time: time

          return
        # END dbAddAppEvent

        sent = yes
        callback true
      i++

    callback(false) if not sent

    return
  # END write
# END Devices

module.exports = Devices