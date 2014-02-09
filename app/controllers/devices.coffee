
_        = require 'lodash'
mongoose = require 'mongoose'
moment   = require 'moment'
commonFn = require '../../lib/common'
log      = require '../../lib/log'
Device   = mongoose.model 'Device'
socket   = null
RN       = '\r\n';

encryption = (data) ->
  return
# encryption

transmission = (data) ->
  return
# transmission

dataHandler = (data) ->
  info = data.split RN
  stt  = ['si','pt','zn','em','dv','li','ss']
  lgt  = ['lsi','lpt','lzn','lem','ldv','lli','lss']
  end  = false

  _.each info, (dt, i) ->
    return if end

    dt = dt.toString

    if commonFn.isc dt, 'quit' # device is asking self termination
      end = true
      socketResp 'See ya ;)'
    else if dt.substr 0,7 == '-hello-' # device is checking if server alive and responding
      log 'n', 'i', "#{socket.id} says hello"
      socketResp 'ok'
    else if ps = commonFn.iss 'en'
      encryption commonFn.gv dt, ps
    else if not socket.tmp? and not commonFn.iss dt, 'sn'
      log 'n', 'i', 'Probably this is welcome message sent from device when initial connect'
      log 'n', 'd', dt
      socket.tmp =
        welcome: dt

    return

  return
# END dataHandler

socketResp = (msg) ->
  socket.write msg+RN
  return
# END socketResp

Devices =
  main: (socket) ->
    socket.id   = socket._handle.fd
    socket.app  = {}
    socket.data = {}
    socket.logs =
      count: 0

    log 'n', 'i', "Client #{socket.id} connected"
    socket.setKeepAlive true, 90000
    socket.write "id?#{RN}"

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
      return

    return
  # END main

module.exports = Devices