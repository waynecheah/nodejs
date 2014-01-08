fs = require 'fs'
_  = require 'lodash'

mongoose   = require 'mongoose'
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

  methods: (Schema, customMethods) ->
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
    obj = require './' + moduleName

    if 'Name' of obj and 'Schema' of obj
      Schema = obj.Schema;
      Schema = appModel.methods Schema, obj.Methods if 'Methods' of obj # extend methods if any

      Model = mongoose.model obj.Name, Schema # compile the model
      Model = appModel.events Model, obj.Events if 'Events' of obj # extend events handle if any

      exports[moduleName] = Model
