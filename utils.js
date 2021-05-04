const Packet = require('./packet.js')
const crypto = require('crypto')
const fetch = require('node-fetch')
const { ExtractParamError } = require('./packets/servererror.js')

module.exports.post = (uri, json) => {
  return fetch(uri, {
    method:"POST", 
    headers:{'Accept': 'application/json', 'Content-Type': 'application/json'},
    body: JSON.stringify(json)
  }).then(res=>{
    if(res.status==404) throw Error(`not found error at post to ${uri}`)
    return res
  }).then(res=>res.json()).then(res=>Packet.parse(res))
  .catch(e=>{throw Packet.from_error(e)})
  .then(packet=>{if(packet.is_error())throw packet;else return packet})
}
module.exports.extract = (object, keys) => new Promise((resolve, reject) => {
  if(object==undefined) reject(ExtractParamSourceUndefinedError({}))
  const ret = {}
  for(let key of keys){
    if(object[key] !== undefined){
      ret[key] = object[key]
    }else reject(ExtractParamError({param_name:key}))
  }
  return resolve(ret)
})
module.exports.random = (length) => {
  const S="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  return Array.from(crypto.randomFillSync(new Uint8Array(length))).map((n)=>S[n%S.length]).join('')
}
module.exports.hash = ({text, salt}) => {
  if(salt==undefined) throw Error("salt is undefined in hash function.")
  const sha512 = crypto.createHash('sha512');
  sha512.update(salt + text)
  return sha512.digest('hex')
}
module.exports.get_fulldomain = (request) => `${request.protocol}://${request.get('host')}`