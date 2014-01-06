fs = require 'fs'
_  = require 'lodash'

lifecycle  = require 'mongoose-lifecycle'
upsertDate = require './plugins/upsertDate'


appModel =
  events: (Model, customEvents) ->
    events =
      beforeInsert: (data) ->
      afterInser: (data) ->
      beforeUpdate: (data) ->
        @modified = new Date if not @modified
      afterUpdate: (data) ->
      beforeSave: (data) ->
      afterSave: (data) ->
      beforeRemove: (data) ->
      afterRemove: (data) ->

    if not customEvents? and _.isObject customeEvents
      _.assign events, customEvents

    _.each events, (fn, name) ->
      Model.on name, (data) ->
        fn data

    Model
  # END events

  methods: (Schame, customMethods) ->
    methods =
      lastUpdate: (model, callback) ->
        @model(model).findOne {}, '-_id modified', sort: modified: -1, callback

    if not customMethods? and _.isObject customMethods
      _.assign methods, customMethods

    _.each methods, (fn, name) ->
      Schema.static name, fn

    Schema.plugin upsertDate
    Schema.plugin lifecycle

    Schema
  # END methods


###
  Modules are automatically loaded once they are declared in the controllers directory.
###
fs.readdirSync(__dirname).forEach (file) ->
  moduleName = file.substr(0, file.indexOf('.'))

  if moduleName isnt 'index' and moduleName isnt 'appModel'
    model = require('./' + moduleName) appModel
    exports[moduleName] = model
