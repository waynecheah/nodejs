fs = require 'fs'

###
  Modules are automatically loaded once they are declared in the models directory.
###
fs.readdirSync(__dirname).forEach (file) ->
  unless file is 'index.js'
    moduleName = file.substr 0, file.indexOf('.')
    exports[moduleName] = require './' + moduleName
