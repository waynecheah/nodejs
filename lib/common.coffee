
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

exports.datetime = ->
    moment().format 'YYMMDDHHmmss'
# datetime


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


strToLong = (str) ->
    ar  = new Array()
    len = Math.ceil(str.length / 4)
    i   = 0

    while i < len
        ar[i] = str.charCodeAt(i << 2) + (str.charCodeAt((i << 2) + 1) << 8) + (str.charCodeAt((i << 2) + 2) << 16) + (str.charCodeAt((i << 2) + 3) << 24)
        i++
    ar
# END strToLong

longToStr = (ar) ->
    len = ar.length
    i = 0

    while i < len
        ar[i] = String.fromCharCode(ar[i] & 0xff, ar[i] >>> 8 & 0xff, ar[i] >>> 16 & 0xff, ar[i] >>> 24 & 0xff)
        i++
    ar.join ''
# END longToStr

strToHex = (str) ->
    charHex = new Array("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f")
    out = ""
    len = str.length
    str = new String(str)
    i = 0

    while i < len
        s = str.charCodeAt(i)
        h = "" + charHex[s >> 4] + "" + charHex[0xf & s]
        out += "" + h
        i++
    out
# END strToHex

hexToStr = (str) ->
    charHex   = new Array("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f")
    stringHex = "0123456789abcdef"
    out = ""
    len = str.length
    str = new String(str)
    str = str.toLowerCase()
    str += "0"  if (len % 2) is 1
    i = 0

    while i < len
        s1 = str.substr(i, 1)
        s2 = str.substr(i + 1, 1)
        index1 = stringHex.indexOf(s1)
        index2 = stringHex.indexOf(s2)
        throw HEX_BROKEN  if index1 is -1 or index2 is -1
        val  = (index1 << 4) | index2
        out += "" + String.fromCharCode(parseInt(val))
        i += 2
    out
# END hexToStr

genRandom = (n) ->
    dict = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`!@#$%^&*()_+-=\\{}[]:<>,.?/\"';"
    ran  = ""
    size = dict.length
    i    = 0

    while i < n
        ran = ran + dict.substr(Math.floor(Math.random() * size), 1)
        i++
    ran
# END genRandom

exports.encryptionTea = (str, key) ->
    str = str + '|'
    remainder = str.length % 16

    if remainder > 13 # 12chars max (4 for padding) (minimum 3 rand chars)
        str = str + genRandom((16 - remainder) + 16)
    else
        str = str + genRandom(16 - remainder)

    bytes = str.length
    log 's', 'i', "Encrypt data (#{bytes} bytes) in Tea: #{str}"

    v = strToLong(str)
    if key.length isnt 4
        k = strToLong(key.slice(0, 16))
    else
        k = key

    n = v.length
    return ""  if n is 0

    v[n++] = 0  if n is 1
    z      = v[n - 1] # long
    y      = v[0]
    sum    = 0
    e      = undefined
    DELTA  = 0x9E3779B9
    q      = Math.floor((6 + 52 / n))

    while q-- > 0
        sum += DELTA
        e = sum >>> 2 & 3
        p = 0 # long

        while p < n - 1
            y = v[p + 1]
            z = v[p] += (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z)
            p++

        y = v[0]
        z = v[n - 1] += (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z)

    enc = strToHex(longToStr(v))
    log 's', 's', "Encrypted data in Tea: #{enc}"
    enc
# END encryptionTea

exports.decryptionTea = (cipher, key) ->
    str   = hexToStr cipher
    v     = strToLong str
    bytes = str.length / 2
    log 's', 'i', "Decrypt data in Tea (#{bytes} bytes): #{str}"

    if key.length isnt 4 # not 4 integer, assume 16bytes string
        k = strToLong(key.slice(0, 16))
    else
        k = key

    n     = v.length
    z     = v[n - 1]
    y     = v[0]
    sum   = 0
    e     = undefined
    DELTA = 0x9E3779B9
    p     = undefined
    q     = undefined
    z     = v[n - 1]
    q     = Math.floor(6 + 52 / n)
    sum   = q * DELTA

    until sum is 0
        e = sum >>> 2 & 3
        p = n - 1

        while p > 0
            z = v[p - 1]
            y = v[p] -= (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z)
            p--
        z = v[n - 1]
        y = v[0] -= (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z)
        sum -= DELTA

    decrData = longToStr v
    decrData = decrData.substr(0, decrData.lastIndexOf('|')) if decrData.indexOf('|') isnt -1
    log 's', 's', "Decrypted data in Tea: #{decrData}"
    decrData
# END decryptionTea
