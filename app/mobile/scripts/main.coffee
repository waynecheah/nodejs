
iz =
  env: 'dev'
  servers:
    devevlopment: ''
    production: []
  wsProcess: []
  socket: null
  transition:
    fxOut: 'pt-page-moveToLeft',
    fxIn: 'pt-page-moveFromRight',
    fxRevOut: 'pt-page-moveToRight',
    fxRevIn: 'pt-page-moveFromLeft'

  init: () ->
    @socketio.init()

    wsProcess  = @wsProcess
    connection = @connection
    websocket  = @websocket
    wsProcess.push 'connecting_websocket'

    socket = io.connect "http://#{document.domain}:8080",
      'max reconnection attempts': 100

    socket.on 'error', () ->
      _.pull wsProcess, 'connecting_websocket'
      connection.isOffline()
      return
    socket.on 'connect', () ->
      _.pull wsProcess, 'connecting_websocket'
      connection.serverOnlineHandler()
      return
    socket.on 'connect_failed', () ->
      _.pull wsProcess, 'connecting_websocket'
      connection.isOffline()
      return
    socket.on 'disconnect', () ->
      #notification 'Server Offline', 'Server is currently detected offline, this may due to scheduled maintenance.', 10000
      connection.isOffline()
      return
    socket.on 'reconnect', () ->
      _.pull wsProcess, 'connecting_websocket'
      websocket.loggedSuccess()
      connection.reconnectHandler()
      connection.isOffline()
      return
    socket.on 'reconnect_failed', () ->
      _.pull wsProcess, 'connecting_websocket'
      connection.isOffline()
      return

    socket.on 'DeviceInformation', () ->
      return
    socket.on 'Offline', () ->
      return
    socket.on 'DeviceUpdate', () ->
      return
    socket.on 'ResponseOnRequest', () ->
      return

    return
  # end init


  socketio:
    serverList: []
    curServerId: 0
    socket: null
    wsProcess: []

    init: () ->
      servers = iz.servers
      env     = iz.env

      servers = if env is 'dev' then servers.development else servers.production
      @serverList = [servers] if _.isString servers

      $(window).on 'internetOn', @connect # make socket connection only when internet enabled
      return
    # END init

    connect: () ->
      serverInUse = @serverList[@curServerId]
      reAttempt   = if @serverList.length is 1 then 1000 else 6 # 6 times retry equal to 10.5 seconds

      debug "Socket.io is connecting to server [#{serverInUse}]"
      @socket = io.connect "http://#{serverInUse}",
        'reconnection limit': 60000 # maximum 60 seconds delay of each reconnection
        'max reconnection attempts': reAttempt
      @connectedHander()

      return
    # END connect

    changeServer: () ->
      nextIndex = @curServerId + 1

      return if not $(window).onLine # internet is down, socket is not able to do reconnect
      return if @serverList.length is 1 # there is no extra server to switch connection

      @curServerId = if nextIndex > @serverList.length then 0 else nextIndex
      @connect()

      return
    # END changeServer

    connectedHander: () ->
      debug        = iz.debug
      socket       = @socket
      changeServer = @changeServer
      serverInUse  = @serverList[@curServerId]
      numServers   = @serverList.length
      retryCount   = 1;

      @socket.on 'error', () ->
        debug 'An error occurs on Socket.io and it cannot be handled by the other event types', 'err'
        return
      @socket.on 'connect', () ->
        debug "Socket.io has make connection to server [#{serverInUse}] successfully!"
        $(window).trigger 'serverOn', ['connected']
        return
      @socket.on 'connect_failed', () ->
        debug "Socket.io fail to make connection to server [#{serverInUse}]", 'warn'
        changeServer()
        return
      @socket.on 'disconnect', () ->
        debug "Socket.io is disconnected from server [#{serverInUse}]", 'warn'
        retryCount = 1
        $(window).trigger 'serverOff'
        return
      @socket.on 'reconnect', () ->
        debug 'Socket.io has reconnected back to server successfully!'
        $(window).trigger 'serverOn', ['reconnected']
        return
      @socket.on 'reconnect_failed', () ->
        debug "Reconnect to server [#{serverInUse}] failed after #{retryCount} times", 'warn'
        retryCount = 1
        if numServers is 1 then socket.socket.connect() else changeServer()
        return
      @socket.on 'reconnecting', () ->
        debug "Reconnecting to server [#{serverInUse}] for #{retryCount} times"
        retryCount++
        return
      return
    # END connectedHander
  # END socketio


  connection:
    serverOnline: null
    checkOnlineImg: 'https://developers.google.com/_static/images/silhouette36.png'

    init: () ->
      $('#internetChecker').on('error', @internetOfflineHandler)
       .on('load', @internetOnlineHandler).attr 'src', @checkOnlineImg
      $(window).on('serverOn', @serverOnlineHandler).on 'serverOff', @serverOfflineHandler
      return
    # END init

    isOffline: () ->
      iz.debug 'Check if server offline'
      serverOnline = @serverOnline = false

      @checkServer()
      @checkInternet()
      setTimeout () ->
        if window.onLine is no
          iz.debug 'Confirm client is disconnected from internet', 'err'
          $(window).trigger 'offline' # confirm internet is offline now, trigger offline event
          $(window).trigger 'internetOff'
        else if serverOnline is no
          iz.debug 'Confirm server is offline', 'err'
          $(windows).trigger 'offline' # confirm server is offline now, trigger offline event
        return
      , 3000

      return
    # END isOffline

    checkServer: (recheck=false) ->
      if not xmlhttp
        wsProcess    = iz.wsProcess
        serverOnline = @serverOnline

        xmlhttp = if window.XMLHttpRequest then new XMLHttpRequest() else new ActiveXObject 'Microsoft.XMLHTTP'
        xmlhttp.onreadystatechange = () ->
          if xmlhttp.readyState is 4 && xmlhttp.status is 200
            iz.debug 'Server is online now'
            $(window).trigger 'online'
            _.pull wsProcess, 'checkServerStatus'
            serverOnline = true
          return

        return if recheck is no and wsProcess.indexOf 'checkServerStatus' >= 0 # checking server status is in progress
        wsProcess.push 'checkServerStatus' if wsProcess.indexOf 'checkServerStatus' < 0 # register task name to progress task list

        now = (new Date()).getTime()
        xmlhttp.open 'GET', "js/online.status.js?t=#{now}", true
        xmlhttp.send()

        setTimeout () ->
          checkServer true if not serverOnline # erver still down
          return
        , 3000

      return
    # END checkServer

    checkInternet: (recheck=false) ->
      wsProcess = iz.wsProcess

      return if recheck is no and wsProcess.indexOf 'checkInternet' >= 0 # checking internet status is in progress
      wsProcess.push 'checkInternet' if wsProcess.indexOf 'checkInternet' < 0 # register task name to progress list

      if recheck is no # assign event listener when make the first checking
        $('#internetChecker').one 'load', () ->
          iz.debug 'Client has internet connectivity now'
          $(window).trigger 'online'
          $(window).trigger 'internetOn'
          window.onLine = true
          _.pull wsProcess, 'checkInternet'
          return

      now = (new Date()).getTime()
      $('#internetChecker').attr 'src', "#{@checkOnlineImg}?t=#{now}"

      setTimeout () ->
        checkInternet true if not window.onLine # internet still down
        return
      , 3000

      return
    # END checkInternet

    internetOnlineHandler: () ->
      iz.debug 'Client has internet connectivity'
      window.onLine = true
      return
    # END internetOnlineHandler

    internetOfflineHandler: () ->
      iz.debug 'Client is disconnected from internet', 'err'
      window.onLine = false
      return
    # END internetOfflineHandler

    serverOnlineHandler: (e, type) ->
      if type is 'reconnected'
        #notification 'Server Online', 'Server is detected back to online now, this may due to maintenance completed.', 10000
        $('div.header span.i-server').removeClass('').addClass "#{icoOnline}text-success"
        return

      $('#status-summary cloud').removeClasss('off dis').addClass 'on'
      websocket.loggedSuccess()
      return
    # END serverOnlineHandler

    serverOfflineHandler: () ->
      #notification 'Server Offline', 'Server is currently detected offline, this may due to scheduled maintenance.', 10000
      $('#status-summary cloud').removeClasss('on dis').addClass 'off'
      $('#status-summary app').removeClasss('on off').addClass 'dis'
      $('.troubles').removeClass('').addClass('text-warning').html 'Unavailable'
      $('.status').removeClass('').addClass('text-warning').html 'Unavailable'
      $('.connection').removeClass('').addClass('text-danger').html 'Disconnected'
      return
    # END serverOfflineHandler
  # END connection


  websocket:
    loggedSuccess: () ->
      id = if userID then userID else $.cookie 'userID'
      socket.emit 'user logged',
        clientId: id
      return
    # END loggedSuccess
  # END websocket


  changePage: (from, to, reverse=false, ts=@transition) ->
    fPage = "div.pt-page-#{from}"
    tPage = "div.pt-page-#{to}"
    fxIn  = if reverse then ts.fxRevIn else ts.fxIn
    fxOut = if reverse then ts.fxRevOut else ts.fxOut
    mrgn  = $("#{tPage} div.header").height()

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
      #console.log 'callback page '+tPage+' compare sHeight '+sHeight
      #console.log $("#{tPage}").height()
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
      if collapsed
        console.groupCollapsed name
      else
        console.group name

    return
  # END gdebug

  debug: (msg, type='log') ->
    if @env is 'pro'
      return

    switch type
      when 'log' then console.log data
      when 'err' then console.err data
      when 'warn' then console.warn data
      when 'table' then console.table data

    return
  # END debug

$ () ->
  #init()

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
