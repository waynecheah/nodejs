
iz =
  env: 'dev'
  servers:
    development: [
      '127.0.0.1:8080'
      'innerzon.com:8081'
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
  transition:
    fxOut: 'pt-page-moveToLeft',
    fxIn: 'pt-page-moveFromRight',
    fxRevOut: 'pt-page-moveToRight',
    fxRevIn: 'pt-page-moveFromLeft'

  init: () ->
    @connection.init()
    @socketio.init()
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
      retryCount   = 1;
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



  changePage: (from, to, reverse, tabNo, ts=@transition) ->
    debug = iz.debug
    fPage = "div.pt-page-#{from}"
    tPage = "div.pt-page-#{to}"
    fxIn  = if reverse then ts.fxRevIn else ts.fxIn
    fxOut = if reverse then ts.fxRevOut else ts.fxOut
    #mrgn  = $("#{tPage} div.header").height()

    sHeight = $(window).height() # get screen height
    $("#{tPage} div.body").css 'min-height', "#{sHeight}px" # make page body to have same height as the screen

    if tabNo # it has tabs in this page
      num  = parseInt tabNo - 1
      left = iz.tabArrowPostion num, tPage # find the absolute left position in pixel
      #$("#{tPage} .tabsBody .arrow").css 'left', "#{left}px" # position the arrow to first tab
      $(".body#{to} .pt-page").removeClass('pt-page-current').css 'height', sHeight # make all tabs to have same height as the screen
      $(".body#{to} .pt-tab-#{tabNo}").addClass 'pt-page-current' # set the right tab to display on screen

    fixedHeader = $('#fixHeader div.header')
    if fixedHeader.length > 0 # if there is any content in current fixed header
      hdPage = fixedHeader.attr 'data-page' # first to find where is it original page came from
      $("div.pt-page-#{hdPage}").prepend fixedHeader # then put the header back tp the page

    $(fPage).addClass "pt-page-current #{fxOut}"
    $(tPage).addClass "pt-page-current #{fxIn} pt-page-ontop"

    setTimeout () -> # when transition is done
      pHeight = $("#{tPage}").height()
      $("#{tPage} div.body").css 'min-height', 200
      debug "callback on destination page #{tPage} compare screen height #{sHeight} with page height #{pHeight}"

      $(fPage).removeClass "pt-page-current #{fxOut}"
      $(tPage).removeClass "#{fxIn} pt-page-ontop"

      header = $("#{tPage} div.header")
      if header.length > 0 # if there is any content in destination header
        $('#fixHeader').html(header).show() # first to migrate the header content from original page to fixed header
        $('#fixHeader div.header').attr 'data-page', to # and don't forget to tell where this header original came from
        setTimeout ->
          $('#fixHeader .arrow').css 'left', "#{left}px" # position the arrow to destination tab
        , 50
        $('#fixHeader .tabs .tab').delay(250).removeClass 'selected'
        setTimeout ->
          $("#fixHeader .tabs .tab:nth(#{num})").addClass 'selected'
        , 400

      if sHeight > $("#{tPage}").height() # make the content fit to screen if it's height shorter then screen height
        $("#{tPage} div.body").css 'height', "#{sHeight}px"

      return
    , 400

    return
  # END changePage

  changeTab: (bodyName, fTab, tTab, ts=@transition) ->
    debug   = iz.debug
    reverse = if fTab > tTab then yes else no
    fxIn    = if reverse then ts.fxRevIn else ts.fxIn
    fxOut   = if reverse then ts.fxRevOut else ts.fxOut
    fTab    = ".body#{bodyName} .pt-tab-#{fTab}"
    tTab    = ".body#{bodyName} .pt-tab-#{tTab}"
    sHeight = $(window).height() # screen height

    $(".body#{bodyName} .pt-page").css 'height', sHeight

    debug "from #{fTab} to #{tTab}"
    $(fTab).addClass "pt-page-current #{fxOut}"
    $(tTab).addClass "pt-page-current #{fxIn} pt-page-ontop"

    setTimeout () ->
      $(fTab).removeClass "pt-page-current #{fxOut}"
      $(tTab).removeClass "#{fxIn} pt-page-ontop"
      return
    , 400
  # END changeTab

  changeIcon: (selector, from, to) ->
    $(selector).addClass('pt-icon-moveInBack').css 'margin-top', '100px'
    setTimeout () ->
      $(selector).removeClass("pt-icon-moveInBack #{from}")
        .addClass("pt-icon-moveOutBack #{to}").css 'margin-top', '2px'

      setTimeout () ->
        $(selector).removeClass 'pt-icon-moveOutBack'
        null
      , 400

      null
    , 400

    null
  # END changeIcon

  onTabClick: ->
    debug = iz.debug
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

    left = iz.tabArrowPostion to # find the left absolute position in pixel
    $('#fixHeader .arrow').attr('pos', 'Y').css 'left', "#{left}px"

    from++
    to++
    debug "body#{page} from tab#{from} to tab#{to}"
    iz.changeTab page, from, to

    return
  # END onTabClick

  tabArrowPostion: (nth, selector='#fixHeader') ->
    width = $(window).width()
    tabs  = $("#{selector} .tabsBody .tab").length # total of tabs in the row
    each  = width / tabs # each tab's width in pixel
    first = (each - 10) / 2 # first tab's arrow left position in pixel

    if nth is 0 then first else first + (nth * each)
  # END tabArrowPostion

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

  _.each $('.fixHeader,.header'), (el) -> # Slide up to hide connectivity status bar
    Hammer(el).on 'dragdown', () ->
      if $('div.fixedStatus').hasClass 'hideUp'
        $('div.fixedStatus').removeClass('hideUp').addClass 'showDown'
      return
    return

  _.each $('.pt-page'), (el) -> # Slide down to show connectivity status bar
    Hammer(el).on 'tap', () ->
      if $('div.fixedStatus').hasClass 'showDown'
        $('div.fixedStatus').removeClass('showDown').addClass 'hideUp'
      return
    return

  _.each $('.pt-page .ln'), (el) -> # Animate each page change
    Hammer(el).on 'tap', () ->
      pages = $(@).attr('data-page').split '-'
      tabNo = $(@).attr('data-tab')

      if pages[0] and pages[1]
        reverse = if pages[2] is 'r' then yes else no
        tabNo   = if pages[3] then pages[3] else null
        iz.changePage pages[0], pages[1], reverse, tabNo
      return
    return

  _.each $('template'), (tpl) -> # load all templates
    id = $(tpl).attr 'id'
    iz.templates[id] = $($(tpl).html())
    tpl.remove()
    return

  $('.tab').click iz.onTabClick
  #$(window).resize ->
  # TODO(resize): resize height for DOM '.body .pt-page'

  return


## START module [ websocket ]
## dependency modules: null ##
do (app = iz) ->
  respondCallback = {}

  init = (e, socket) ->
    console.warn 'socket conencted'
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

    stTxt = if st is 0 then 'Disarmed' else 'Armed'
    $('div.body2 li:first-child div:last-child').html stTxt

    updateAllZones device
    updateSystemInfo device

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

      tyTxt = map.system.type[ty]
      stTxt = map.system.status[st]

      tpl.find('li div:nth(1)').html tyTxt
      tpl.find('li div:nth(2)').html stTxt
      html += $(tpl).html()
      return

    $('div.body2 li:nth(1) div:last-child').html "#{ok} OK<br />#{ntok} Fail"
    $('div.body2a .pt-tab-2 .tabContent ul').html html
    return
  # END updateSystemInfo

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
        return

      socket.on 'DeviceInformation', (data) ->
        return if 'status' of data is no or typeof data.status isnt 'boolean'
        if data.status
          that.devices = data.devices
          updateAllDeviceStatus data.devices, true
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
  # END websocket

  $(window).on 'initSocketListener', init

  app
# END module websocket


## START module [ appInteraction ]
## dependency modules: websocket ##
do (app = iz) ->
  websocket = app.websocket

  emitReq = (req, data) ->
    websocket.emitReq req, data
    return
  # END emitReq


  app.appInteraction =
    armDisarmed: ->
      cur  = websocket.devices[0].data.status.pt[0]
      info = cur.split ','
      stt  = if info[1] then 0 else 1

      callback = (data) ->
        return if data.status is false
        websocket.devices[0].data.status.pt[0] = "1,#{stt},103"
        return
      # END callback

      emitReq '/events/armDisarmed', no: 1, cmd: stt, password: 1234, callback

      return
    # END armDisarmed

    updateLights: ->
      return
    # END updateLights
  # END appInteraction

  app
# END module appInteraction


## START module [ client ]
## dependency modules: Backbone ##
do (app = iz) ->
  debug = app.debug

  Client = Backbone.Model.extend
    defaults:
      username: ''
      password: ''
      fullname: ''
      accessToken: ''
      services: ''

    validate: (attrs) ->
      return 'Please fill up your username' if not attrs.username
      return 'Please fill up your password' if not attrs.password
      'Please fill up your fullname' if not attrs.fullname
    # END validate

    initialize: ->
      debug 'Client model has been initialized.'
      @.on 'invalid', (model, error) ->
        debug error, 'err'
        return
      return
    # END initialize
  # END Client


  app.client =
    register: ->
      client = new Client
        username: 'cheahkokweng@gmail.com'
        password: 'abc123'
        fullname: 'Wayne Cheah'
      client.save()
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