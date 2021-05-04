const {extract} = require('./utils.js')
const { SignInRequiredError, RequestedUriNotSetError } = require('./packets/servererror.js')

const USER_ID_SESSION = 'moauth_user_id'
const REQUESTED_URI_SESSION = 'moauth_requested_uri'
const ACCESS_TOKEN_SESSION = 'moauth_access_token'

module.exports.set_user_id = (session, user_id) => {
  session[USER_ID_SESSION] = user_id
}
module.exports.get_user_id = (session) => {
  return extract(session, [USER_ID_SESSION])
  .then(ret=>ret[USER_ID_SESSION])
  .catch(packet=>{
    if(packet.title='ExtractParamError') throw SignInRequiredError()
    throw packet
  })
}
module.exports.set_requested_uri = (session, requested_uri) => {
  session[REQUESTED_URI_SESSION] = requested_uri
}
module.exports.get_requested_uri = (session) => {
  return extract(session, [REQUESTED_URI_SESSION])
  .then(ret=>ret[REQUESTED_URI_SESSION])
  .catch(packet=>{
    if(packet.title='ExtractParamError') throw RequestedUriNotSetError()
    throw packet
  })
}
module.exports.unset_requested_uri = (session) => {
  delete session[REQUESTED_URI_SESSION]
}
module.exports.set_access_token = (session, access_token) => {
  session[ACCESS_TOKEN_SESSION] = access_token
}
module.exports.get_access_token = (session) => {
  return extract(session, [ACCESS_TOKEN_SESSION])
  .then(ret=>ret[ACCESS_TOKEN_SESSION])
  .catch(packet=>{
    if(packet.title='ExtractParamError') throw SignInRequiredError()
    throw packet
  })
}