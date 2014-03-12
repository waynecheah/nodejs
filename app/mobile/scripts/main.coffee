
iz =
  env: 'dev'
  servers:
    development: [
      '127.0.0.1:8080'
      'innerzon.com:8080'
      'cheah.homeip.net:8080'
    ]
    production: [
      'innerzon.com:8080'
      'innerzon.com.my:8080'
    ]
  config:
    mapping:
      system:
        type:
          0: 'N/A'
          1: 'AC'
          2: 'Battery'
          3: 'PSTN'
          4: 'Bell'
          5: 'Peripheral'
          6: 'GSM'
          7: 'Comm Fail'
        status:
          0: 'Ok'
          1: 'Alarm'
          2: 'Fault'

      partition:
        status:
          0: 'Disarmed'
          1: 'Away'
          2: 'Home'
          3: 'Night'
        user:
          100: 'User1'
          101: 'Keyfob'
          102: 'Auto'
          103: 'Remote'

      zone:
        condition:
          0: 'Disable'
          1: 'Open'
          2: 'Close'
        status:
          0: 'Ready'
          1: 'Alarm'
          2: 'Bypass'
          3: 'Trouble'
          4: 'Tamper'
        type:
          0: 'N/A'
          1: 'Delay'
          2: 'Instant'
          3: 'Follower'
          4: '24hr'
          5: 'Delay2'
          6: 'Keyswitch'

      emergency:
        type:
          0: 'N/A'
          1: 'Panic'
          2: 'Medical'
          3: 'Fire'
          4: 'Duress'
        status:
          0: 'Ok',
          1: 'Alarm'

      light:
        type:
          0: 'Disable'
          1: 'Normal'
          2: 'Dim'
          3: 'Toggle'
          4: 'Pulse'
          5: 'Blink'
          6: 'Delay'
        status:
          0: 'Off'
          1: 'On'
          2: 'Dim'
        user:
          101: 'Keyfob'
          102: 'Auto'
          103: 'Remote'

      sensor:
        type:
          0: 'Disable'
          1: 'Normal Open'
          2: 'Normal Close'
          3: 'Potential'
        status:
          0: 'N/A'
          1: 'Open'
          2: 'Close'

      label:
        item:
          zn: 'Zone'
          dv: 'Device'
          li: 'Light'
          ss: 'Sensor'
          us: 'User'

  progressTasks: []
  templates: {}
  socket: null

  init: () ->
    @connection.init()
    @socketio.init()
    @interface.init()
    @appInteraction.init()
    return
  # end init


  ## dependency modules: null ##
  socketio:
    serverList: []
    curServerId: 0
    socket: null

    init: () ->
      servers = iz.servers
      env     = iz.env
      #connect = @connect.bind @

      onInternetOn = () ->
        if @socket
          @socket.socket.reconnect()
        else
          @connect()
        return
      # END onInternetOn

      servers = if env is 'dev' then servers.development else servers.production
      @serverList = if _.isString servers then [servers] else servers

      $(window).on 'internetOn', onInternetOn.bind @ # only make socket connection when internet enabled
      return
    # END init

    connect: () ->
      debug = iz.debug

      serverInUse = @serverList[@curServerId]
      reAttempt   = if @serverList.length is 1 then 1000 else 5 # 5 times retry equal to 7.5 seconds

      debug "Socket.io is connecting to server [#{serverInUse}]"
      @socket = io.connect "http://#{serverInUse}",
        'reconnection limit': 60000 # maximum 60 seconds delay of each reconnection
        'max reconnection attempts': reAttempt
      @socketHandler()
      $(window).trigger 'initSocketListener', [@socket] # fire and check any other listener wants attact to socket

      return
    # END connect

    changeServer: () ->
      debug     = iz.debug
      nextIndex = @curServerId + 1

      return if not window.onLine # internet is down, socket is not able to do reconnect
      return if @serverList.length is 1 # there is no extra server to switch connection

      debug 'Swtich other server and make connection to it'
      @curServerId = if nextIndex > @serverList.length then 0 else nextIndex
      @connect()

      return
    # END changeServer

    socketHandler: () ->
      debug        = iz.debug
      socket       = @socket
      changeServer = @changeServer
      serverInUse  = @serverList[@curServerId]
      numServers   = @serverList.length
      retryCount   = 1
      onError      = () ->
        debug "Error on Socket.io at server [#{serverInUse}] and it can't be handled by the other event types", 'err'
        @changeServer()
        return
      onConnFailed = () ->
        debug "Socket.io fail to make connection to server [#{serverInUse}]", 'warn'
        @changeServer()
        return
      onRecoFailed = () ->
        debug "Reconnect to server [#{serverInUse}] failed after #{retryCount} times", 'warn'
        retryCount = 1
        if numServers is 1 then socket.socket.connect() else changeServer()
        return

      @socket.on 'error', onError.bind @
      @socket.on 'connect', () ->
        debug "Socket.io has make connection to server [#{serverInUse}] successfully!", 'info'
        $(window).trigger 'serverOn', ['connected']
        return
      @socket.on 'connect_failed', onConnFailed.bind @
      @socket.on 'connecting', () ->
        debug 'Socket.io fires connecting event'
        return
      @socket.on 'disconnect', () ->
        debug "Socket.io is disconnected from server [#{serverInUse}]", 'warn'
        retryCount = 1
        $(window).trigger 'serverOff'
        return
      @socket.on 'reconnect', () ->
        debug 'Socket.io has reconnected back to server successfully!', 'info'
        $(window).trigger 'serverOn', ['reconnected']
        return
      @socket.on 'reconnect_failed', onRecoFailed.bind @
      @socket.on 'reconnecting', () ->
        debug "Reconnecting to server [#{serverInUse}] for #{retryCount} times"
        retryCount++
        return

      return
    # END socketHandler
  # END socketio

  ## dependency modules: null ##
  sockJS: # TODO(plan): add sockJS support as second option to websocket implementation
    serverList: []
    curServerId: 0
    socket: null

    init: () ->
      return
    # END init

    connect: () ->
      $(window).trigger 'initSocketListener', [@socket] # fire and check any other listener wants attact to socket
      return
    # END connect

    changeServer: () ->
      return
    # END changeServer

    socketHandler: () ->
      socket = @socket
      return
    # END socketHandler
  # END sockJS


  ## dependency modules: null ##
  connection:
    curImageId: 0
    checkOnlineImg: 'https://developers.google.com/_static/images/silhouette36.png'
    onlineImages: [
      'https://developers.google.com/_static/images/silhouette36.png'
      'http://innerzon.com/img/innerzon.png'
    ]
    retryCount: 1
    recheckDelay: 500

    init: ->
      progressTasks = iz.progressTasks
      debug         = iz.debug
      retryCount    = @retryCount
      recheckDelay  = @recheckDelay
      checkInternet = @checkInternet.bind @

      onLoad = ->
        retryCount = 1

        if progressTasks.indexOf('firstInternetDetection') >= 0
          debug 'Client side has internet connected already', 'info'
          $(window).trigger 'internetOn'
          _.pull progressTasks, 'firstInternetDetection'
        else
          if progressTasks.indexOf('checkIsOffline') >= 0
            debug 'Internet seems alright, probably only the server is not accessible'
            _.pull progressTasks, 'checkIsOffline'
          if progressTasks.indexOf('recheckingInternet') >= 0
            debug 'Client side is now reconnected to internet', 'info'
            $(window).trigger 'internetOn'
            _.pull progressTasks, 'recheckingInternet'

        return
      # END loLoad

      onError = ->
        delayTime = retryCount * recheckDelay
        delayTime = if delayTime > 60000 then 60000 else delayTime # limit delay time in 60 seconds

        if progressTasks.indexOf('firstInternetDetection') >= 0
          debug 'Client side has no internet enabled', 'err'
          $(window).trigger 'internetOff', ['startup']
          _.pull progressTasks, 'firstInternetDetection'
        else
          if progressTasks.indexOf('checkIsOffline') >= 0 # confirmation check from disconnection
            debug 'Confirm client side is disconnected from internet', 'err'
            $(window).trigger 'offline' # confirm internet is offline now, trigger offline event
            $(window).trigger 'internetOff', ['between']
            _.pull progressTasks, 'checkIsOffline'
          if progressTasks.indexOf('recheckingInternet') >= 0 # still offline, repeat checking internet later
            _.pull progressTasks, 'recheckingInternet'

        setTimeout () -> # set delay period before re-attempt checking
          return if progressTasks.indexOf('checkIsOffline') >= 0 # avoid concurrent crash with rechecking progress

          debug "Retry checking internet for #{retryCount} times"
          retryCount++
          progressTasks.push 'recheckingInternet' # register recheking task name to progress list
          checkInternet()
          return
        , delayTime

        return
      # END onError

      onServerOff = ->
        @serverOfflineHandler()
        @isOffline()
        return
      # END onServerOff

      debug 'Run the very first internet checking..'
      progressTasks.push 'firstInternetDetection'

      $('#internetChecker').on('error', onError).on('load', onLoad)
       .attr 'src', @onlineImages[0] # first attempt checking if internet accessible

      $(window).on('internetOff', @internetOfflineHandler).on('internetOn', @internetOnlineHandler)
      .on('deviceOn', @deviceOnlineHandler).on('deviceOff', @deviceOfflineHandler)
      .on('serverOff', onServerOff.bind @).on 'serverOn', @serverOnlineHandler
      return
    # END init

    isOffline: -> # do checking if internet is dropped from connection
      progressTasks = iz.progressTasks
      debug         = iz.debug

      debug 'Check if client side internet is dropped from connection'
      progressTasks.push 'checkIsOffline'

      if progressTasks.indexOf('recheckingInternet') < 0 # avoid concurrent crash with rechecking progress
        @checkInternet() # confirmation if internet dropped should run without any delay time

      return
    # END isOffline

    checkInternet: ->
      debug  = iz.debug
      nextId = @curImageId + 1

      if @onlineImages.length is 1
        imgUrl = @onlineImages[0]
      else
        nextId      = if @onlineImages.length <= nextId then 0 else nextId
        imgUrl      = @onlineImages[nextId]
        @curImageId = nextId

      debug "Check internet status by using online image [#{imgUrl}]"
      now = (new Date()).getTime()
      $('#internetChecker').attr 'src', "#{imgUrl}?t=#{now}"

      return
    # END checkInternet

    internetOnlineHandler: ->
      iz.debug 'Changing internet status to online now'
      $('#status-summary .line').removeClass('off dis').addClass 'on'
      window.onLine = true
      return
    # END internetOnlineHandler

    internetOfflineHandler: (e, stage) ->
      iz.debug 'Changing internet status to offline now', 'warn'
      $('#status-summary .line').removeClass('on dis').addClass 'off'
      $('#status-summary .cloud').removeClass('on off').addClass 'dis'
      $('#status-summary .app').removeClass('on off').addClass 'dis'
      window.onLine = false
      return
    # END internetOfflineHandler

    serverOnlineHandler: (e, type) ->
      debug = iz.debug

      if type is 'reconnected'
        #notification 'Server Online', 'Server is detected back to online now, this may due to maintenance completed.', 10000
        #$(window).trigger 'internetOn' # maybe remove this line, because of web services API
        return

      debug 'Changing server status is connected now'
      $('#status-summary .cloud').removeClass('off dis').addClass 'on'
      return
    # END serverOnlineHandler

    serverOfflineHandler: ->
      iz.debug 'Changing server status is disconnected now'
      #notification 'Server Offline', 'Server is currently detected offline, this may due to scheduled maintenance.', 10000
      $('#status-summary .cloud').removeClass('on dis').addClass 'off'
      $('#status-summary .app').removeClass('on off').addClass 'dis'
      #$('.troubles').removeClass('').addClass('text-warning').html 'Unavailable'
      #$('.status').removeClass('').addClass('text-warning').html 'Unavailable'
      #$('.connection').removeClass('').addClass('text-danger').html 'Disconnected'
      return
    # END serverOfflineHandler

    deviceOnlineHandler: ->
      iz.debug 'Changing device status to online now'
      $('#status-summary .app').removeClass('off dis').addClass 'on'
      return
    # END deviceOnlineHandler

    deviceOfflineHandler: ->
      iz.debug 'Changing device status to offline now'
      $('#status-summary .app').removeClass('on dis').addClass 'off'
      return
    # END deviceOfflineHandler
  # END connection


  gdebug: (name, collapsed=false) ->
    if @env is 'pro'
      return

    if not name
      console.groupEnd()
    else
      if collapsed then console.groupCollapsed name else console.group name

    return
  # END gdebug

  debug: (msg, type='log') ->
    return if @env is 'pro'

    switch type
      when 'log' then console.log msg
      when 'info' then console.info msg
      when 'err' then console.error msg
      when 'warn' then console.warn msg
      when 'table' then console.table msg

    return
  # END debug

$ () ->
  iz.init()
  return
# END document ready


## START module [ websocket ]
## dependency modules: null ##
do (app = iz) ->
  respondCallback = {}

  init = (e, socket) ->
    app.websocket.init socket
    return
  # END init

  updateAllDeviceStatus = (devices, trigger=false) ->
    if trigger is yes
      eName = if devices[0].online then 'deviceOn' else 'deviceOff' # TODO(devices): when users can have more devices installed
      $(window).trigger eName

    # call some functions to update all statuses
    device = devices[0]
    armStt = device.data.status.partition[0] # arm status
    k      = armStt.split ','

    n  = k[0] # partition number
    st = parseInt k[1] # status
    us = parseInt k[2] # user

    if st is 0
      $(window).trigger 'disarm'
      stTxt = 'Disarmed'
    else
      $(window).trigger 'arm'
      stTxt = 'Armed'

    ttlZn = device.data.status.zones.length
    $('div.body2 li:first-child .totalZones').html "#{ttlZn} zones detected"
    $('div.body2 li:first-child div.armStatus').html stTxt

    updateAllZones device
    updateSystemInfo device
    updateEmergency device

    return
  # END updateAllDeviceStatus

  updateAllZones = (device) ->
    map  = iz.config.mapping
    html = ''

    _.each device.data.status.zones, (zone) ->
      tpl = app.templates.zoneList

      k  = zone.split ','
      n  = k[0] # zone number
      cd = parseInt k[1] # condition
      st = parseInt k[2] # status
      pt = k[3] # partition
      ty = parseInt k[4] # type
      id = "zn#{n}"

      cdCls = switch cd
        when 0 then 'disabled'
        when 1 then 'open'
        when 2 then 'closed'
      stCls = switch st
        when 1 then 'danger'
        when 2 then 'bypass'
        when 3 then 'trouble'
        when 4 then 'tamper'

      cdTxt = map.zone.status[cd]
      tyTxt = if ty > 0 then map.zone.type[ty] else ''
      tyTxt = "<br /><span>#{tyTxt}</span>" if tyTxt

      tpl.find('li').attr 'id', "id-#{id}"
      tpl.find('li div:nth(1)').html "Zone #{n}#{tyTxt}"
      tpl.find('li div:nth(2)').html cdTxt
      html += $(tpl).html()
      return

    $('div.body2a .pt-tab-1 .tabContent ul').html html
    return
  # END updateAllZones

  updateSystemInfo = (device) ->
    map  = iz.config.mapping
    html = ''
    ok   = 0 # Ready/Restore
    ntok = 0 # Fault
    alrm = 0 # Alarm
    icon =
      1: 'PowerAdapter',
      2: 'MenuBox',
      3: 'Phone',
      4: 'Siren',
      5: 'iMac',
      6: 'phone',
      7: 'Message'

    _.each device.data.status.system, (si, i) ->
      return if i is 0

      tpl = app.templates.systemInfo

      k  = si.split ','
      ty = parseInt k[0] # type
      st = parseInt k[1] # status

      if st is 1
        stCls = 'alarm'
        alrm++
      else if st is 2
        stCls = 'fault'
        ntok++
      else
        stCls = 'ready'
        ok++

      icCls = icon[ty]
      tyTxt = map.system.type[ty]
      stTxt = map.system.status[st]

      tpl.find('li div:first span.ico').attr 'class', "ico icon-#{icCls}"
      tpl.find('li div:nth(1)').html tyTxt
      tpl.find('li div:nth(2) span:first').attr('class', stCls).html stTxt
      html += $(tpl).html()
      return
    # END each loop

    $('div.body2 li:nth(1) div:last-child').html "#{ok} OK<br />#{ntok} Fail"
    $('div.body2a .pt-tab-2 .tabContent ul').html html
    return
  # END updateSystemInfo

  updateEmergency = (device) ->
    map = iz.config.mapping

    _.each device.data.status.emergency, (em) ->
      k  = em.split ','
      tp = parseInt k[0] # type
      st = parseInt k[1] # status

      if tp > 0 # all types start from index 1
        tpTxt = map.emergency.type[tp]
        $(window).trigger 'emergencyStatus', [tpTxt,st]
      return

    return
  # END updateEmergency

  updateDeviceStatus = (data, devices) ->
    _.each devices, (device, i) ->
      devices[i] = data if device.data.info.sn is data.serial
      return
    updateAllDeviceStatus devices, false # TODO(justify): if it's alright to update everything & render whole page

    return
  # END updateDeviceStatus

  updateDeviceOffline = (serial, devices) ->
    _.each devices, (device, i) ->
      if device.data.info.sn is serial
        device.online = no
        devices[i]    = device
      return

    return
  # END updateDeviceOffline

  registerRespond = (req, callback) ->
    return if req of respondCallback is true
    respondCallback[req] = callback
    return
  # END registerRespond


  app.websocket =
    socket: null
    userId: 'kennymetta@gmail.com'
    devices: null
    serverOnListened: false

    init: (socket) ->
      that    = @
      @socket = socket

      socket.on 'Online', (data) ->
        app.debug "Device serial [#{data.serial}] is report connected to server", 'info'
        $(window).trigger 'deviceOn'
        return
      socket.on 'Offline', (data) ->
        app.debug "Device serial [#{data.serial}] is reported offline from server", 'warn'
        updateDeviceOffline data.serial, that.devices
        $(window).trigger 'deviceOff'
        return
      socket.on 'DeviceUpdate', (data) ->
        updateDeviceStatus data, that.devices
        $(window).trigger 'deviceDataUpdated'
        return

      socket.on 'DeviceInformation', (data) ->
        return if 'status' of data is no or typeof data.status isnt 'boolean'
        if data.status
          that.devices = data.devices
          updateAllDeviceStatus data.devices, true
          $(window).trigger 'deviceDataUpdated'
        return
      socket.on 'ResponseOnRequest', (req, data) ->
        respondCallback[req] data if req of respondCallback is true
        return


      return if @serverOnListened
      @serverOnListened = true

      onServerOn = (e, type) ->
        return if not @socket or not @userId

        # only when websocket connection to server has established and user has logined
        @socket.emit 'GET_DEVICE_INFO', userID: @userId, token: '123456'

        # TODO(remove): to be replaced by line above
        #id = if @userID then @userID else 0 #$.cookie 'userID'
        #@socket.emit 'user logged', clientId: id

        return
      # END onServerOn

      $(window).on('serverOn', onServerOn.bind @)

      return
    # END init

    emitReq: (req, data, resCallback=null) ->
      registerRespond req, resCallback if resCallback
      @socket.emit 'APP_REQUEST', req, data
      return
    # END emitReq

    resCbList: ->
      respondCallback
    # END resCbList
  # END websocket

  $(window).on 'initSocketListener', init

  app
# END module websocket


## START module [ appInteraction ]
## dependency modules: websocket ##
do (app = iz) ->
  websocket = app.websocket

  emitReq = (req, data, callback) ->
    websocket.emitReq req, data, callback
    return
  # END emitReq

  curArmStatus = ->
    return if not websocket.devices

    cur  = websocket.devices[0].data.status.partition[0]
    info = cur.split ','
    if info[1] is '0' then 0 else 1
  # END curArmStatus

  setArmStatus = (stt, user) ->
    if stt is 0 then $(window).trigger 'disarm' else $(window).trigger 'arm'
    websocket.devices[0].data.status.partition[0] = "1,#{stt},#{user}"
    return
  # END setArmStatus


  app.appInteraction =
    init: ->
      $(window).on('arm', ->
        return
      ).on('disarm', ->
        return
      )
      return
    # END init

    curArmStatus: ->
      curArmStatus()
    # END curArmStatus

    armDisarmed: (passcode, callbackUI) ->
      callback = (data) ->
        if data.status is false
          callbackUI data
          return

        stt = curArmStatus()
        stt = if stt then 0 else 1
        setArmStatus stt, 103
        callbackUI data
        return
      # END callback

      stt = curArmStatus()
      stt = if stt then 0 else 1
      emitReq '/events/armDisarmed', no: 1, cmd: stt, password: passcode, callback

      return
    # END armDisarmed

    alarm: (type, callbackUI) ->
      method = if type is 1 then 'panic' else 'duress'

      emitReq "/events/#{method}", no: 1, type: type, status: 1, (data) ->
        return callbackUI data if data.status is false

        _.each websocket.devices[0].data.status.emergency, (em, i) ->
          k  = em.split ','
          tp = parseInt k[0] # type

          if tp is 1
            websocket.devices[0].data.status.emergency[i] = '1,1,103' # means 'panic, on, remote user'
          else if tp is 4
            websocket.devices[0].data.status.emergency[i] = '4,1,103' # means 'duress, on, remote user'

          return
        # END each loop

        callbackUI data
        return

      return
    # END alarm

    updateLights: ->
      return
    # END updateLights
  # END appInteraction

  app
# END module appInteraction


## START module interface
## dependency modules: appInteraction ##
do (app = iz) ->
  debug          = app.debug
  appInteraction = app.appInteraction
  onProgress     = {}
  onArmStatusBar = no
  onPasscode     = no
  deviceOnline   = no
  currentPageNo  = 0
  currentTabNo   = alarm: null
  passcode       = []
  emergencyStt   = {}

  onProgressHandle = (taskname) ->
    switch taskname
      when 'armAction'
        status  = appInteraction.curArmStatus()
        element = $ '.armAction .status'

        onProgress.armAction = on
        setTimeout ->
          onProgressHandle 'armActionCompleted' if onProgress.armAction is on
          return
        , 5000

        element.find('.armDescription').html 'In progress, please wait..'
        $('.armAction .status .armButton').hide()
        $('.armAction .status .closeArmAction .ico').hide()
        $('.armAction .status .closeArmAction .loading').show()
        $('.armAction .status .closeArmAction').show()

        if status
          element.find('.curArmStatus').html 'Disarming...'
        else
          element.find('.curArmStatus').html 'Arming...'
      when 'armActionCompleted'
        status  = appInteraction.curArmStatus()
        element = $ '.armAction .status'

        onProgress.armAction = off

        if status
          element.find('.curArmStatus').html 'Armed Away.'
          element.find('.armDescription').html 'Press to Disarm'
        else
          element.find('.curArmStatus').html 'Disarmed.'
          element.find('.armDescription').html 'Press to Arm'

        $('.armAction .status .armButton').show()
        $('.armAction .status .closeArmAction').hide()
      when 'panic'
        onProgress.panic = on
        setTimeout ->
          onProgressHandle 'panicCompleted' if onProgress.panic is on
          return
        , 5000
      when 'panicCompleted'
        onProgress.panic = off
      when 'duress'
        onProgress.duress = on
        setTimeout ->
          onProgressHandle 'duressCompleted' if onProgress.duress is on
          return
        , 5000
      when 'duressCompleted'
        onProgress.duress = off
    # END switch

    return
  # END onProgressHandle

  changeArmStatus = (force=no) ->
    return unless onArmStatusBar or force

    status = appInteraction.curArmStatus()
    s      = $ '.armAction .status'

    if 'panic' of emergencyStt is yes and emergencyStt.panic # in Panic activated status
      desc = if onPasscode then 'Enter Passcode to Disarm' else 'Press to Disarm'
      $('.armAction').removeClass('armedBgColor').addClass 'disarmBgColor'
      s.removeClass('disarm').addClass 'armed'
      s.find('.icon').removeClass('icon-UnLock icon-Locked').addClass 'icon-Siren'
      s.find('.curArmStatus').html 'Panic.'
      s.find('.armDescription').html desc
      s.find('.armButton').html 'Disarm'
      return


    if status
      desc = if onPasscode then 'Enter Passcode to Disarm' else 'Press to Disarm'
      $('.armAction').removeClass('disarmBgColor').addClass 'armedBgColor'
      s.removeClass('disarm').addClass 'armed'
      s.find('.icon').removeClass('icon-UnLock icon-Siren').addClass 'icon-Locked'
      s.find('.curArmStatus').html 'Armed Away.'
      s.find('.armDescription').html desc
      s.find('.armButton').html 'Disarm'
    else
      desc = if onPasscode then 'Enter Passcode to Arm' else 'Press to Arm'
      $('.armAction').removeClass('armedBgColor').addClass 'disarmBgColor'
      s.removeClass('armed').addClass 'disarm'
      s.find('.icon').removeClass('icon-Locked icon-Siren').addClass 'icon-UnLock'
      s.find('.curArmStatus').html 'Disarmed.'
      s.find('.armDescription').html desc
      s.find('.armButton').html 'Arm'
  # END changeArmStatus

  changePageBgColor = (color) ->
    color = 'red' if 'panic' of emergencyStt is yes and emergencyStt.panic # in Panic activated status

    if color is 'green'
      $('#pt-main .passcode, #fullpage .armAction .passcode').removeClass('redTheme').addClass 'greenTheme'
      $('#pt-main .tabsBody, #fixHeader .tabsBody').removeClass('bgRed').addClass 'bgGreen'
      $('#pt-main .pt-page-2a .body2a, #pt-main .pt-page-2 .body2').removeClass('bgRed').addClass 'bgGreen'
    else if color is 'red'
      $('#pt-main .passcode, #fullpage .armAction .passcode').removeClass('greenTheme').addClass 'redTheme'
      $('#pt-main .pt-page-2a .tabsBody, #fixHeader .tabsBody').removeClass('bgGreen').addClass 'bgRed'
      $('#pt-main .pt-page-2a .body2a, #pt-main .pt-page-2 .body2').removeClass('bgGreen').addClass 'bgRed'
    return
  # END changePageBgColor

  tabArrowPostion = (nth, selector='#fixHeader') ->
    width = $(window).width()
    tabs  = $("#{selector} .tabsBody .tab").length # total of tabs in the row
    each  = width / tabs # each tab's width in pixel
    first = (each - 10) / 2 # first tab's arrow left position in pixel

    if nth is 0
      $(window).trigger 'onSecurityTab'
    else
      $(window).trigger 'onOtherTab'

    if nth is 0 then first else first + (nth * each)
  # END tabArrowPostion

  hideArmDisarmActionBar = ->
    height = $(window).height()
    $('.armAction').css 'top', "#{height}px"
    onArmStatusBar = no
    return
  # END hideArmDisarmActionBar

  showArmDisarmActionBar = ->
    return unless deviceOnline

    height = armDisarmBarPosition()

    changeArmStatus true
    setTimeout ->
      $('.armAction').css 'top', "#{height}px"
      onArmStatusBar = yes
    , 400
    return
  # END showArmDisarmActionBar

  armDisarmBarPosition = ->
    height = $(window).height() - $('.armButton').outerHeight true
    height - 2
  # END armDisarmBarPosition

  togglePasscode = (turnOff=false) ->
    return if turnOff and not onPasscode # no need to turn off since passcode is not showing on screen

    status = appInteraction.curArmStatus()
    if status
      desc1 = 'Press to Disarm'
      desc2 = 'Enter Passcode to Disarm'
    else
      desc1 = 'Press to Arm'
      desc2 = 'Enter Passcode to Arm'

    if onPasscode # showing passcode screen, toggle to close it
      onPasscode = no
      $('.armAction').css 'top', armDisarmBarPosition()
      $('.armAction .status .armDescription').html desc1
      $('.armAction .status .armButton').show()
      $('.armAction .status .closeArmAction').hide()
      $('#fixHeader .header').removeClass 'blur'

      if currentPageNo is '2'
        $('.body2').removeClass 'blur'
      else if currentPageNo is '2a'
        $(".body2a .pt-tab-#{currentTabNo.alarm}").removeClass 'blur'

      passcode = []

      setTimeout ->
        fullpageAction = $ '#fullpage .armAction'
        $('#pt-main').prepend fullpageAction

        $('.armAction .passcode .digits table tr td div').remove()
        $('.armAction .passcode .keypad .ok').hide()
        $('.armAction .passcode .keypad .cancel').html 'Cancel'
        return
      , 400
    else # Passcode is hidden at bottom, toggle to show it
      onPasscode = yes
      actionBar  = $ '#pt-main .armAction'
      $('#fullpage').html actionBar

      setTimeout ->
        $('.armAction').css 'top', 0
        $('.armAction .status .armDescription').html desc2
        $('.armAction .status .armButton').hide()
        $('.armAction .status .closeArmAction .ico').hide()
        $('.armAction .status .closeArmAction .closeKeypad').show()
        $('.armAction .status .closeArmAction').show()
        return
      , 50
      setTimeout ->
        $('#fixHeader .header').addClass 'blur'
        if currentPageNo is '2'
          $('.body2').addClass 'blur'
        else if currentPageNo is '2a'
          $(".body2a .pt-tab-#{currentTabNo.alarm}").addClass 'blur'
        return
      , 310

    return
  # END togglePasscode

  enterPasscode = ->
    length = $('.armAction .passcode .digits table tr td div').length
    $('.armAction .passcode .digits table tr td').append '<div></div>'
    $('.armAction .passcode .keypad .ok').show() if length > 2
    $('.armAction .passcode .keypad .cancel').html 'Delete'
    return
  # END enterPasscode

  armDisarmUpdateCallback = (data) ->
    if data.status
      console.log data
    else
      debug 'Arm/Disarm update unsuccessful', 'err'
      debug data
      onProgressHandle 'armActionCompleted'
    return
  # END armDisarmUpdateCallback

  panicUpdateCallback = (data) ->
    if data.status
      console.log data
    else
      debug "Turn on Emergency Panic unsuccessful", 'err'
      onProgressHandle 'panicCompleted'
    return
  # END panicUpdateCallback

  duressUpdateCallback = (data) ->
    if data.status
      console.log data
    else
      onProgressHandle 'duressCompleted'
      debug "Turn on Emergency Duress unsuccessful", 'err'
    return
  # END duressUpdateCallback

  disableButton = -> # server or device offline
    emergencyStt = {}
    $('.body2a .pt-tab-3 ul.online').removeClass 'online'
    return
  # END disableButton

  enableButton = (type, status) -> # display emergency in activated or off status
    $('.body2a .pt-tab-3 ul').addClass 'online'

    if status is 1
      remove = 'off button'
      add    = 'activate'
      stTxt  = 'Activated'
    else if status is 0
      remove = 'activate'
      add    = 'off button'
      stTxt  = 'Off'
    else
      debug "Invalid emergency status update: [#{status}]", 'err'
      return

    switch type
      when 'Panic'
        emergencyStt.panic = status
        $('.body2a .pt-tab-3 .panic').removeClass(remove).addClass(add).html stTxt
      when 'Duress'
        emergencyStt.duress = status
        $('.body2a .pt-tab-3 .duress').removeClass(remove).addClass(add).html stTxt

    return
  # END enableButton

  screenResize = ->
    height = $(window).height()
    $('.screenHeight').css 'height', "#{height}px"
    return
  # END screenResize

  onTap = (selector, evt, callback) ->
    _.each $(selector), (el) ->
      Hammer(el).on evt, callback
      return
    return
  # END onTap

  onTouch = (selector, event, callback) ->
    el = document.querySelector selector
    Hammer(el).on event, callback
    return
  # END onTouch


  app.interface =
    transition:
      fxOut: 'pt-page-moveToLeft'
      fxIn: 'pt-page-moveFromRight'
      fxRevOut: 'pt-page-moveToRight'
      fxRevIn: 'pt-page-moveFromLeft'

    init: ->
      that = @

      _.each $('.fixHeader,.header'), (el) ->
        Hammer(el).on 'dragdown', () -> # Slide down to show connectivity status bar
          if $('div.fixedStatus').hasClass 'hideUp'
            $('div.fixedStatus').removeClass('hideUp').addClass 'showDown'
            $('#overlay').show()
          return
        return

      _.each $('#overlay'), (el) ->
        Hammer(el).on 'tap', () -> # Slide up to hide connectivity status bar
          if $('div.fixedStatus').hasClass 'showDown'
            $('div.fixedStatus').removeClass('showDown').addClass 'hideUp'
            $('#overlay').hide()
          return
        return

      _.each $('.pt-page .ln'), (el) ->
        Hammer(el).on 'tap', -> # Animate each page change
          pages = $(@).attr('data-page').split '-'
          tabNo = $(@).attr('data-tab')

          if pages[0] and pages[1]
            reverse = if pages[2] is 'r' then yes else no
            tabNo   = if pages[3] then pages[3] else null
            that.changePage pages[0], pages[1], reverse, tabNo
          return
        return

      _.each $('template'), (tpl) -> # load all templates
        id = $(tpl).attr 'id'
        app.templates[id] = $($(tpl).html())
        tpl.remove()
        return

      onTap '.tab', 'tap', @onTabClick
      onTap '.armAction .armButton, .armAction .closeArmAction', 'tap', -> # tap to close passcode keypad
        return if $('.armAction .status .closeArmAction .loading:visible').length
        togglePasscode()
        return
      onTap '.armAction .keypad .ok', 'tap', -> # send arm/disarm command to server
        appInteraction.armDisarmed passcode.join(''), armDisarmUpdateCallback
        togglePasscode yes
        onProgressHandle 'armAction'
        return
      onTap '.armAction .cancel', 'tap', ->
        length = $('.armAction .passcode .digits table tr td div').length
        if length > 0
          $('.armAction .passcode .digits table tr td div:last-child').remove()
          passcode.pop()

          if length is 1
            $('.armAction .passcode .keypad .cancel').html 'Cancel'
          else if length < 5
            $('.armAction .passcode .keypad .ok').hide()
        else
          togglePasscode true
        return
      onTap '.armAction .passcodeButton', 'touch', -> # very fast capture when screen get touched, add onTap class
        $(@).addClass 'onTap'
        passcode.push $(@).attr 'data-no'
        enterPasscode()
        return
      onTap '.armAction .passcodeButton', 'tap', -> # if finger is not on hold, onTop class will be removed
        setTimeout ->
          $('.armAction .passcodeButton').removeClass 'onTap'
          return
        , 200
        return
      onTap '.armAction .passcodeButton', 'hold', -> # when finger on hold, keep the onTap class there
        $(@).addClass 'onTap'
        passcode.push $(@).attr 'data-no'
        return
      onTap '.armAction .passcodeButton', 'release', -> # when finger release, class onTap should have removed
        setTimeout ->
          $('.armAction .passcodeButton').removeClass 'onTap'
          return
        , 200
        return
      onTouch '.body2a .pt-tab-3 .panic', 'tap', ->
        # em status not updated, server/device may offline || already turn on em
        return if 'panic' of emergencyStt is no or emergencyStt.panic is 1
        emergencyStt.panic = -1 # processing..
        appInteraction.alarm 1, panicUpdateCallback
        onProgressHandle 'panic'
        return
      onTouch '.body2a .pt-tab-3 .duress', 'tap', ->
        # em status not updated, server/device may offline || already turn on em
        return if 'duress' of emergencyStt is no or emergencyStt.duress is 1
        emergencyStt.duress = -1 # processing..
        appInteraction.alarm 4, duressUpdateCallback
        onProgressHandle 'duress'
        return

      $(window).on('serverOff', ->
        togglePasscode true
        setTimeout hideArmDisarmActionBar, 50
        disableButton()
        return
      ).on('deviceOn', ->
        deviceOnline = yes
        showArmDisarmActionBar() if currentPageNo is '2' or currentPageNo is '2a'
        return
      ).on('deviceOff', ->
        deviceOnline = no
        togglePasscode true
        setTimeout hideArmDisarmActionBar, 50
        disableButton()
        return
      ).on('changePage', (e, from, to) ->
        currentPageNo = to
        hideArmDisarmActionBar() if to isnt '2' and to isnt '2a'
        showArmDisarmActionBar() if to is '2'
        return
      ).on('arm', ->
        onProgressHandle 'armActionCompleted'
        changeArmStatus()
        changePageBgColor 'green'
        return
      ).on('disarm', ->
        onProgressHandle 'armActionCompleted'
        changeArmStatus()
        changePageBgColor 'red'
        return
      ).on('emergencyStatus', (event, type, status) ->
        enableButton type, status
        return
      ).on('deviceDataUpdated', changeArmStatus)
       .on('onSecurityTab', showArmDisarmActionBar)
       .on('onOtherTab', showArmDisarmActionBar).trigger('onOtherTab')
      .trigger 'changePage', ['0', '1']

      $(window).resize(screenResize).trigger 'resize'
      return
    # END init

    debug: ->
      currentTabNo.alarm
    # END debug

    changePage: (from, to, reverse, tabNo, ts=@transition) ->
      fPage = "div.pt-page-#{from}"
      tPage = "div.pt-page-#{to}"
      fxIn  = if reverse then ts.fxRevIn else ts.fxIn
      fxOut = if reverse then ts.fxRevOut else ts.fxOut

      sHeight = $(window).height() # get screen height
      $("#{tPage} div.body")
      .css 'min-height', "#{sHeight}px" # make page body to have same height as the screen

      if tabNo # it has tabs in this page
        num  = parseInt tabNo - 1
        left = tabArrowPostion num, tPage # find the absolute left position in pixel
        #$("#{tPage} .tabsBody .arrow").css 'left', "#{left}px" # position the arrow to first tab
        $(".body#{to} .pt-page").removeClass('pt-page-current')
        .css 'height', sHeight # make all tabs to have same height as the screen
        $(".body#{to} .pt-tab-#{tabNo}")
        .addClass 'pt-page-current' # set the right tab to display on screen
        currentTabNo.alarm = tabNo

      fixedHeader = $('#fixHeader div.header')
      if fixedHeader.length > 0 # if there is any content in current fixed header
        hdPage = fixedHeader.attr 'data-page' # first to find where is it original page came from
        $("div.pt-page-#{hdPage}")
        .prepend fixedHeader # then put the header back tp the page

      $(window).trigger 'changePage', [from, to]
      $(fPage).addClass "pt-page-current #{fxOut}"
      $(tPage).addClass "pt-page-current #{fxIn} pt-page-ontop"

      setTimeout () -> # when transition is done
        pHeight = $("#{tPage}").height()
        $("#{tPage} div.body").css 'min-height', 200
        debug "callback on destination page #{tPage} compare
              screen height #{sHeight} with page height #{pHeight}"

        $(fPage).removeClass "pt-page-current #{fxOut}"
        $(tPage).removeClass "#{fxIn} pt-page-ontop"

        header = $("#{tPage} div.header")
        if header.length > 0 # if there is any content in destination header
          $('#fixHeader').html(header).show() # first to migrate the header content from original page to fixed header
          $('#fixHeader div.header').attr 'data-page', to # and don't forget to tell where this header original came from
          setTimeout ->
            $('#fixHeader .arrow')
            .css 'left', "#{left}px" # position the arrow to destination tab
          , 50
          $('#fixHeader .tabs .tab').delay(250).removeClass 'selected'
          setTimeout ->
            $("#fixHeader .tabs .tab:nth(#{num})")
            .addClass 'selected'
          , 400

        if sHeight > $("#{tPage}").height() # make the content fit to screen if it's height shorter then screen height
          $("#{tPage} div.body").css 'height', "#{sHeight}px"

        return
      , 400

      return
    # END changePage

    changeTab: (bodyName, fTab, tTab, ts=@transition) ->
      currentTabNo.alarm = tTab

      reverse = if fTab > tTab then yes else no
      fxIn    = if reverse then ts.fxRevIn else ts.fxIn
      fxOut   = if reverse then ts.fxRevOut else ts.fxOut
      fTab    = ".body#{bodyName} .pt-tab-#{fTab}"
      tTab    = ".body#{bodyName} .pt-tab-#{tTab}"
      sHeight = $(window).height() # screen height

      $(".body#{bodyName} .pt-page").css 'height', sHeight

      debug "from [#{fTab}] to [#{tTab}]"
      $(fTab).addClass "pt-page-current #{fxOut}"
      $(tTab).addClass "pt-page-current #{fxIn} pt-page-ontop"

      setTimeout () ->
        $(fTab).removeClass "pt-page-current #{fxOut}"
        $(tTab).removeClass "#{fxIn} pt-page-ontop"
        return
      , 400
    # END changeTab

    changeIcon: (selector, from, to) ->
      $(selector)
      .addClass 'pt-icon-moveInBack'
        .css 'margin-top', '100px'

      setTimeout () ->
        $(selector)
        .removeClass "pt-icon-moveInBack #{from}"
          .addClass "pt-icon-moveOutBack #{to}"
            .css 'margin-top', '2px'

        setTimeout () ->
          $(selector)
          .removeClass 'pt-icon-moveOutBack'
          return
        , 400

        return
      , 400

      return
    # END changeIcon

    onTabClick: ->
      return if $(@).hasClass 'selected'

      page = $(@).parents('.header').attr 'data-page'
      tabs = $('#fixHeader .tabsBody .tab').length # total of tabs in the row
      i    = 0
      j    = 0
      from = null
      to   = null

      return if typeof page is 'undefined'

      while tabs > i
        from = i if $("#fixHeader .tabsBody .tab:nth(#{i})").hasClass 'selected'
        i++

      return if from is null

      $("#fixHeader .tabsBody .tab:nth(#{from})").removeClass 'selected'
      #$(@).parent('.tabs').find('.selected').removeClass 'selected'
      $(@).addClass 'selected'

      while tabs > j
        to = j if $("#fixHeader .tabsBody .tab:nth(#{j})").hasClass 'selected'
        j++

      return if to is null

      left = tabArrowPostion to # find the left absolute position in pixel
      $('#fixHeader .arrow').attr('pos', 'Y').css 'left', "#{left}px"

      from++
      to++
      debug "body#{page} from tab#{from} to tab#{to}"
      app.interface.changeTab page, from, to

      return
    # END onTabClick
  # END interface

  app
# END module interface


## START module [ client ]
## dependency modules: Backbone ##
do (app = iz) ->
  debug = app.debug

  privacy_method = ->
    return
  # END privacy_method


  app.client =
    register: ->
      return
    # END register

    login: ->
      return
    # END login

    logout: ->
      return
    # END logout
  # END client

  app
# END module client


## START module name
## dependency modules: null ##
do (app = iz) ->
  private_property = null
  private_method = ->
  private_method = ->
    protected_method = () ->
    return


  app.module =
    property: null
    method: ->
  # END module

  app
# END module name


#window.iz = iz