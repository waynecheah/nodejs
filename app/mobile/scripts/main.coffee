
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
  progressTasks: []
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
      .on('deviceOn', @deviceOnlineHandler).on('deviceOn', @deviceOfflineHandler)
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
      $('.troubles').removeClass('').addClass('text-warning').html 'Unavailable'
      $('.status').removeClass('').addClass('text-warning').html 'Unavailable'
      $('.connection').removeClass('').addClass('text-danger').html 'Disconnected'
      return
    # END serverOfflineHandler

    deviceOnlineHandler: ->
      iz.debug 'Changing device status to online now'
      $('#status-summary .app').removeClass('off dis').addClass 'on'
      return
    # END deviceOnlineHandler

    deviceOfflineHandler: ->
      iz.debug 'Changing device status to offline now', 'warn'
      $('#status-summary .app').removeClass('on dis').addClass 'off'
      return
    # END deviceOfflineHandler
  # END connection



  changePage: (from, to, reverse=false, ts=@transition) ->
    debug = iz.debug
    fPage = "div.pt-page-#{from}"
    tPage = "div.pt-page-#{to}"
    fxIn  = if reverse then ts.fxRevIn else ts.fxIn
    fxOut = if reverse then ts.fxRevOut else ts.fxOut
    #mrgn  = $("#{tPage} div.header").height()

    sHeight = $(window).height()
    $("#{tPage} div.body").css 'min-height', "#{sHeight}px"

    fixedHeader = $('#fixHeader div.header')
    if fixedHeader.length > 0
      hdPage = fixedHeader.attr 'data-page'
      $("div.pt-page-#{hdPage}").prepend fixedHeader


    $(fPage).addClass "pt-page-current #{fxOut}"
    $(tPage).addClass "pt-page-current #{fxIn} pt-page-ontop"

    setTimeout () ->
      $("#{tPage} div.body").css 'min-height', 200
      debug "callback page #{tPage} compare sHeight #{sHeight}"
      debug $("#{tPage}").height()
      $(fPage).removeClass "pt-page-current #{fxOut}"
      $(tPage).removeClass "#{fxIn} pt-page-ontop"

      header = $("#{tPage} div.header")
      if header.length > 0
        $('#fixHeader').html(header).show()
        $('#fixHeader div.header').attr 'data-page', to

      if sHeight > $("#{tPage}").height()
        $("#{tPage} div.body").css 'height', "#{sHeight}px"

      null
    , 400

    null
  # END changePage

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

  _.each $('.fixHeader,.header'), (el) ->
    Hammer(el).on 'dragdown', () ->
      if $('div.fixedStatus').hasClass 'hideUp'
        $('div.fixedStatus').removeClass('hideUp').addClass 'showDown'

      null
    null

  _.each $('.pt-page'), (el) ->
    Hammer(el).on 'tap', () ->
      if $('div.fixedStatus').hasClass 'showDown'
        $('div.fixedStatus').removeClass('showDown').addClass 'hideUp'

      null
    null

  _.each $('.pt-page .ln'), (el) ->
    Hammer(el).on 'tap', () ->
      pages = $(@).attr('data-page').split '-'

      if pages[0] and pages[1]
        reverse = true if pages[2] is 'r'
        iz.changePage pages[0], pages[1], reverse

      null
    null

  null


## START module websocket
## dependency modules: null ##
do (app = iz) ->
  respondCallback = {}

  init = (e, socket) ->
    app.websocket.init socket
    return
  # END init

  updateDeviceStatus = (data) ->
    eName = if data.online then 'deviceOn' else 'deviceOff'
    $(window).trigger eName

    # call some functions to update all statuses
    # func 1
    # func 2

    return
  # END updateDeviceStatus

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

      socket.on 'DeviceInformation', (data) ->
        that.devices = data
        updateDeviceStatus data
        return
      socket.on 'Offline', () ->
        return
      socket.on 'DeviceUpdate', () ->
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


## START module appInteraction
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


## START module client
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