
crypto       = require 'crypto'
moment       = require 'moment'
randomString = require 'random-string'

log = require './log'
RN = '\r\n'


exports.isc = (data, cmd) ->
  length = cmd.length
  data   = data.replace RN, ''
  data   = data.substr 0, length

  return true if data is cmd

  false
# isc

exports.issi = (data, key) ->
  data = data.replace RN, ''
  pos1 = data.search key
  pos2 = data.search '='

  return false if pos1 < 0 or pos2 < 0

  index = data.substr (pos1+1), (pos2-1)

  p: (pos2+1), i: index
# issi

exports.iss = (data, key) -> # is set
  length = key.length + 1
  data   = data.replace RN, ''
  data   = data.substr 0, length

  return length if data is key+'='

  false
# iss

exports.gv = (data, start) -> # get value
  data = data.replace RN, ''
  data.substr start
# gv

exports.encryption = (data, key, iv, format) ->
  cipher = crypto.createCipheriv 'aes-128-cbc', key, iv
  strlen = data.length
  random = false
  i      = 1

  while random is false
    if i > 16 # make maximum limit of 256 string long
      log 'w', 'w', 'Can not encrypt data more than 256 characters long'
      log 'w', 'd', data
      random = -1
      return

    bytes  = 16 * i
    minlen = bytes - 4

    if strlen <= minlen
      random = (bytes - 1) - strlen
      bytes  = "#{bytes} bytes"
    else
      i++
  # END while loop

  return false if not random or random < 0

  random = randomString length:random
  data   = random + '|' + data
  log 's', 'i', "Encrypt data (#{bytes}): #{data}"

  cipher.setAutoPadding false
  enc = cipher.update data, 'utf8', format
  log 's', 's', "Encrypted data: #{enc}"

  enc
#  encryption

exports.decryption = (data, key, iv, format) ->
  bytes = data.length / 2
  log 's', 'i', "Decrypt data (#{bytes} bytes): #{data}"
  decipher = crypto.createDecipheriv 'aes-128-cbc', key, iv

  decipher.setAutoPadding false
  decrData = decipher.update data, format, 'utf8'
  position = decrData.indexOf '|' # get separator position

  if position < 0 # invalid data, there should have a | within decrypted data
    log 's', 'e', "Invalid decrypted data: #{decrData}"
    return false

  log 's', 's', "Decrypted data: #{decrData}"
  decrData.substr position+1;
# decryption

exports.datetime = ->
  moment().format 'YYMMDDHHmmss'
# datetime