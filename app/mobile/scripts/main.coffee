
iz =
  env: 'dev'
  wsProcess: []
  socket: null
  transition:
    fxOut: 'pt-page-moveToLeft',
    fxIn: 'pt-page-moveFromRight',
    fxRevOut: 'pt-page-moveToRight',
    fxRevIn: 'pt-page-moveFromLeft'

  init: () ->
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

  connection:
    serverOnline: null

    init: () ->
      img = 'https://developers.google.com/_static/images/silhouette36.png'
      $('#internetChecker').on('error', @internetOfflineHandler)
      .on('load', @internetOnlineHandler).attr 'src', img
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

    checkServer: () ->
      return
    # END checkServer

    checkInternet: () ->
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

    serverOnlineHandler: () ->
      $('#status-summary cloud').removeClasss('off dis').addClass 'on'
      return
    # END serverOnlineHandler

    serverOfflineHandler: () ->
      $('#status-summary cloud').removeClasss('on dis').addClass 'off'
      $('#status-summary app').removeClasss('on off').addClass 'dis'
      $('.troubles').removeClass('').addClass('text-warning').html 'Unavailable'
      $('.status').removeClass('').addClass('text-warning').html 'Unavailable'
      $('.connection').removeClass('').addClass('text-danger').html 'Disconnected'
      return
    # END serverOfflineHandler

    reconnectHandler: () ->
      #notification 'Server Online', 'Server is detected back to online now, this may due to maintenance completed.', 10000
      $('div.header span.i-server').removeClass('').addClass "#{icoOnline}text-success"
      return
    # END reconnectHandler
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
