
iz =
  transition:
    fxOut: 'pt-page-moveToLeft',
    fxIn: 'pt-page-moveFromRight',
    fxRevOut: 'pt-page-moveToRight',
    fxRevIn: 'pt-page-moveFromLeft'

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

$ () ->
  _.each $('.pt-page .ln'), (el) ->
    Hammer(el).on 'tap', () ->
      pages = $(@).attr('data-page').split '-'

      if pages[0] and pages[1]
        reverse = true if pages[2] is 'r'
        iz.changePage pages[0], pages[1], reverse

      null
    null

  null
