
_        = require 'lodash'
mongoose = require 'mongoose'
moment   = require 'moment'
config   = require '../../config/config'
commonFn = require '../../lib/common'
log      = require '../../lib/log'
Device   = mongoose.model 'Device'
Event    = mongoose.model 'Event'
Status   = mongoose.model 'Status'
socket   = null
sockets  = []
RN       = '\r\n';

encryption = (data) ->
  str = commonFn.decryption data, config.aesKey, config.aesIv, 'hex'
  dataRoutes str if str
  return
# END encryption

dataRoutes = (data) ->
  stt = ['si','pt','zn','em','dv','li','ss']
  lgt = ['lsi','lpt','lzn','lem','ldv','lli','lss']

  if 'info' of socket.data is false # when device has not logged, all data sent will go here
    # PROCESS OF AUTHORISATION
    getDeviceInfo data
  else if 'status' of socket.data is false # get all current status from device
    # PROCESS OF ALL STATUS UPDATE
    getCurrentStatus data
  else if lgt.indexOf(data.substr 0,3) >= 0 # receive event logs from device
    # EVENT LOG RECEIVED WILL UPDATE SERVER DATABASE
    getEventLogs data
  else if stt.indexOf(dt.substr 0,2) >= 0 # receive status update from device
    # SOME STATUS HAS CHANGED ON DEVICE, APP MIGHT NEED TO REFRESH WITH THE UPDATE
    getDeviceUpdate data
  else if commonFn.isc data, 'ok' # device reply 'ok' to confirm it received of previous sent command
    reportedOkay data
  else # send error to other and don't try to make funny thing to server
    log 'n', 'e', "Client #{socket.id} just sent an invalid input: #{data}"
    socketResp 'e0'

  return
# END dataRoutes

getDeviceInfo = (data) ->
  if ps = commonFn.iss data, 'cn'
    socket.tmp.cn = commonFn.gv data, ps
    socketResp 'ok'
  else if ps = commonFn.iss data, 'sn'
    value = commonFn.gv data, ps
    log 'n', 'i', "Received serial: #{value}"
    socket.tmp.sn = value
    socketResp 'ok'
  else if ps = commonFn.iss data, 'pn'
    value = commonFn.gv data, ps
    log 'n', 'i', "Received product name: #{value}"
    socket.tmp.pn = value
    socketResp 'ok'
  else if ps = commonFn.iss data, 'vs'
    value = commonFn.gv data, ps
    log 'n', 'i', "Received version: #{value}"
    socket.tmp.vs = value
    socketResp 'ok'
  else if commonFn.isc data, '-done-'
    t = socket.tmp

    if 'cn' of t is false or 'sn' of t is false or 'pn' of t is false or 'vs' of t is false
      log 'n', 'w', 'Device has not submitted all required authorization data'
      socketResp 'e3'
      return

    Device.findOne serial: t.sn, 'id macAdd lastSync', (err, doc) ->
      if err
        log 'n', 'e', err
        log 'n', 'd', t
        socketResp 'e2'
      else if not doc or 'id' of doc is false # unrecognized serial
        log 'n', 'w', "Device ID [#{socket.id}] made an invalid access. Unrecognized serial #{t.sn}"
        log 'n', 'd', t
        socketResp 'e4'
      else
        lastSync = if 'lastSync' of doc is true then doc.lastSync else ''

        log 'n', 'i', "Device ID [#{socket.id}] has logged successfully"
        log 'n', 'd', t
        log 'n', 'd', doc

        socket.data =
          deviceId: doc.id
          info: t
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

        socketResp 'sr?' # ask device's status report

      return
  else if data
    log 'n', 'e', "Invalid input #{data}"
    socketResp 'e0'

  return
# END getDeviceInfo

getCurrentStatus = (data) ->
  if ps = commonFn.iss data, 'si' # system info
    str = commonFn.gv data, ps
    key = getKeys str, 'system info', 2

    unless key
      socketResp 'e5'
      return

    info = getMap 'system', key[0], key[1]
    log 'n', 'i', "Received system info update: #{info}"
    socket.tmp.system.push str
    socketResp 'ok'
  else if ps = commonFn.iss data, 'pt' # partition status
    str = commonFn.gv data, ps
    key = getKeys str, 'partition status', 3

    unless key
      socketResp 'e5'
      return

    info = getMap 'partition', key[1], key[2]
    log 'n', 'i', "Received partition status update: Partition #{key[0]} = #{info}"
    socket.tmp.partition.push str
    socketResp 'ok'
  else if ps = commonFn.iss data, 'zn' # zones status
    str = commonFn.gv data, ps
    key = getKeys str, 'zone status', 5

    unless key
      socketResp 'e5'
      return

    info = getMap 'zone', key[1], key[2], key[4]
    log 'n', 'i', "Received zone status update: Partition #{key[3]} Zone #{key[0]} = #{info}"
    socket.tmp.zones.push str
    socketResp 'ok'
  else if ps = commonFn.iss data, 'em' # emergency status
    str = commonFn.gv data, ps
    key = getKeys str, 'emergency status', 3

    unless key
      socketResp 'e5'
      return

    info = getMap 'emergency', key[0], key[1], key[2]
    log 'n', 'i', "Received emergency status update: #{info}"
    socket.tmp.emergency.push str
    socketResp 'ok'
  else if ps = commonFn.iss data, 'dv' # device status
    str = commonFn.gv data, ps
    key = getKeys str, 'device status', 5

    unless key
      socketResp 'e5'
      return

    info = getMap 'light', key[1], key[2], key[3], key[4]
    log 'n', 'i', "Received device status update: Device #{key[0]} = #{info}"
    socket.tmp.devices.push str
    socketResp 'ok'
  else if ps = commonFn.iss data, 'li' # lights status
    str = commonFn.gv data, ps
    key = getKeys str, 'light status', 5

    unless key
      socketResp 'e5'
      return

    info = getMap 'light', key[1], key[2], key[3], key[4]
    log 'n', 'i', "Received light status update: Light #{key[0]} = #{info}"
    socket.tmp.lights.push str
    socketResp 'ok'
  else if ps = commonFn.iss data, 'ss' # sensor status
    str = commonFn.gv data, ps
    key = getKeys str, 'sensor status', 4

    unless key
      socketResp 'e5'
      return

    info = getMap 'sensor', key[1], key[2], key[3]
    log 'n', 'i', "Received sensor status update: Sensor #{key[0]} = #{info}"
    socket.tmp.sensors.push str
    socketResp 'ok'
  else if ps = commonFn.iss data, 'lb' # label status
    str = commonFn.gv data, ps
    key = getKeys str, 'label list', 3

    unless key
      socketResp 'e5'
      return

    info = getMap 'label', key[0], key[1], key[2]
    log 'n', 'i', "Received label update: #{info}"
    socket.tmp.labels.push str
    socketResp 'ok'
  else if commonFn.isc data, '-done-'
    t = socket.tmp

    if t.system.length < 5
      log 'n', 'w', 'Reported system status found incomplete'
      socketResp 'e7'
    else if t.partition.length is 0
      log 'n', 'w', 'No any partition status reported'
      socketResp 'e8'
    else if t.zones.length is 0
      log 'n', 'w', 'No any zone status reported'
      socketResp 'e9'
    else
      log 'n', 'i', 'All current status have updated successfully'
      socket.data.status = socket.tmp
      socket.tmp         = {}

      dbUpdateLastSync socket.data.info.sn
      dbStatusUpdate socket, () ->
        # emit device info to clients who connect to it
        return
  else if data
    log 'n', 'e', "Invalid input #{data}"
    socketResp 'e0'

  return
# END getCurrentStatus

getEventLogs = (data) ->
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
      socketResp 'e5'
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
      socketResp 'e5'
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
      socketResp 'e5'
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
      socketResp 'e5'
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
      socketResp 'e5'
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
    log 'n', 'e', "Invalid input: #{data}"
    socketResp 'e0'

  return
# END getEventLogs

getDeviceUpdate = (data) ->
  loopUpdate = (type, key, str) ->
    _.each socket.data.status[type], (s, i) ->
      k = s.split ','

      if key and k[0] is key
        log 's', 's', "Socket status data '#{type}' has updated to [#{str}]"
        socket.data.status[type][i] = str

        log 'n', 'i', "Server reply 'ok' to device for the status update:- #{data}"
        key = null
        socketResp 'ok'
        dbStatusUpdate socket
      return
    return
  # END loopUpdate

  if ps = commonFn.iss data, 'si'
    str = commonFn.gv data, ps
    key = getKeys str, 'system info update', 2

    unless key
      socketResp 'e5'
      return

    loopUpdate 'system', key[0], str
  else if ps = commonFn.iss data, 'pt'
    str = commonFn.gv data, ps
    key = getKeys str, 'partition update', 3

    unless key
      socketResp 'e5'
      return

    loopUpdate 'partition', key[0], str
  else if ps = commonFn.iss data, 'zn'
    str = commonFn.gv data, ps
    key = getKeys str, 'zone update', 5

    unless key
      socketResp 'e5'
      return

    loopUpdate 'zones', key[0], str
  else if ps = commonFn.iss data, 'em'
    str = commonFn.gv data, ps
    key = getKeys str, 'emergency update', 3

    unless key
      socketResp 'e5'
      return

    loopUpdate 'emergency', key[0], str
  else if ps = commonFn.iss data, 'li'
    str = commonFn.gv data, ps
    key = getKeys str, 'light update', 5

    unless key
      socketResp 'e5'
      return

    loopUpdate 'lights', key[0], str
  else if data
    log 'n', 'e', "invalid input: #{data}"
    socketResp 'e0'
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

reportedOkay = () ->
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

dbUpdateLastSync = (serial, callback) ->
  lastSync = new Date

  Device.findOneAndUpdate serial: serial, lastSync:lastSync, (err) ->
    if err
      log 'n', 'e', err
      socketResp 'e2'
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
      socketResp 'e10'
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
      socketResp 'e6'
      return

    log 's', 's', "#{type} event has logged successfully"
    log 's', 'd', doc

    socketResp 'ok'
    socket.logs.datetime = cond.datetime
    socket.logs.count   += 1

    if callback? and _.isFunction callback
      callback()

    return

  return
# END dbEventUpdate

dbUpdateAppEvent = (eid) ->
  if not eid?
    return

  cond =
    _id: eid
  update =
    $set:
      success: true

  Event.findOneAndUpdate cond, update, (err, doc) ->
    if err
      log 's', 'e', err
      return

    log 's', 's', 'Update App event delivered and execute at hardware side successfully'
    log 's', 'd', doc
    return

  return
# END dbUpdateAppEvent


dataHandler = (data) ->
  data = data.toString()
  info = data.split RN
  end  = false

  _.each info, (dt, i) ->
    return if end
    return if not dt

    if commonFn.isc dt, 'quit' # device is asking self termination
      end = true
      i   = 0
      socketResp 'See ya ;)'

      while i < sockets.length
        if sockets[i] is socket
          sockets[i].end()
          i = sockets.length
        i++
    else if dt.substr 0,7 == '-hello-' # device is checking if server alive and responding
      log 'n', 'i', "#{socket.id} says hello"
      socketResp 'ok'
    else if not socket.tmp and not commonFn.iss dt, 'cn'
      log 'n', 'i', 'Probably this is welcome message sent from device when initial connect'
      log 'n', 'd', dt
      socket.tmp =
        welcome: dt
    else if ps = commonFn.iss dt, 'en'
      encryption commonFn.gv dt, ps
    else
      dataRoutes dt

    return
  # END each loop

  return
# END dataHandler

getKeys = (str, err, length) ->
  key = str.split ','

  if key.length isnt length
    log 'n', 'e', "Invalid #{err}, improper format sent"
    return false

  key
# END getKeys

socketResp = (msg) ->
  socket.write msg+RN
  return
# END socketResp


Devices =
  main: (sock) ->
    socket      = sock
    socket.id   = socket._handle.fd
    socket.app  = {}
    socket.data = {}
    socket.tmp  = null
    socket.logs =
      count: 0

    log 'n', 'i', "Client #{socket.id} connected"
    sockets.push socket # assign socket to global variable
    socket.setKeepAlive true, 90000
    socketResp 'id?'

    socket.on 'data', dataHandler
    socket.on 'end', () ->
      log 'n', 'i', "Client #{socket.id} has sent FIN packet to close connection, host acknowledge by send back FIN"
      return
    socket.on 'error', (data) ->
      log 'n', 'i', "The connection for client #{socket.id} has error occur"
      log 'n', 'd', data
      return
    socket.on 'close', (hasErr) ->
      msg = if hasErr then 'Error occur before connection closed' else 'No error was found'
      log 'n', 'i', "client #{socket.id} has disconnected. #{msg}"

      delete socket.data

      i = sockets.indexOf socket
      if i >= 0
        sockets.splice i, 1

      return

    return socket
  # END main

  getSockets: () ->
    sockets
  # END getSocket
# END Devices

module.exports = Devices