fs = require 'fs'
_  = require 'lodash'

# appController = require './appController'
appController =
  layout: 'default'

  beforeRender: ->

  render: (name, layout) ->
    @beforeRender()

###
  Modules are automatically loaded once they are declared in the controllers directory.
###
fs.readdirSync(__dirname).forEach (file) ->
  moduleName = file.substr(0, file.indexOf('.'))

  if moduleName isnt 'index' and moduleName isnt 'appController'
    controller = require('./' + moduleName)

    if not _.isFunction(controller) and not _.isArray(controller) and _.isObject(controller) # extend if it's an Object
      exports[moduleName] = _.assign appController, controller
    else
      exports[moduleName] = controller



###
  Use with ExpressJS framework
## #
module.exports = (app) ->
  # homepage
  app.get '/', (req, res, next) ->
    res.render 'index.handlebars', data:{}


  # All Controllers
  require('./users') app
###