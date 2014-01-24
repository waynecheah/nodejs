
iz =
  transition:
    fxOut: 'pt-page-moveToLeft',
    fxIn: 'pt-page-moveFromRight',
    fxRevOut: 'pt-page-moveToRight',
    fxRevIn: 'pt-page-moveFromLeft'

  changePage: (from, to, reverse=false, ts=@transition) ->
    fxIn  = if reverse then ts.fxRevIn else ts.fxIn
    fxOut = if reverse then ts.fxRevOut else ts.fxOut

    $(from).addClass "pt-page-current #{fxOut}"
    $(to).addClass "pt-page-current #{fxIn} pt-page-ontop"

    setTimeout () ->
      console.log fxOut
      $(from).removeClass "pt-page-current #{fxOut}"
      $(to).removeClass "#{fxIn} pt-page-ontop"
      null
    , 400

    null

$ () ->
  _.each $('.pt-page .ln'), (el) ->
    Hammer(el).on 'tap', () ->
      pages = $(@).attr('data-page').split '-'

      if pages[0] and pages[1]
        reverse = true if pages[2] is 'r'
        iz.changePage "div.pt-page-#{pages[0]}", "div.pt-page-#{pages[1]}", reverse

      null
    null

  null
