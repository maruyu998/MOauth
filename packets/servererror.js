const Packet = require('../packet.js')

// common errors
module.exports.ExtractParamError = ({param_name, object_name}) => new Packet({
  title: "ExtractParamError",
  message: `Parameter "${param_name}" is required${object_name?` in ${object_name}`:""}.`,
  details: { param_name },
  is_error: true
})
module.exports.ExtractParamSourceUndefinedError = ({object_name}) => new Packet({
  title: "ExtractParamSourceUndefinedError",
  message: `Extract source object is undefined.`,
  details: {object_name}
})
module.exports.ParamError = ({param_name, value}) => new Packet({
  title: "ParamError",
  message: `Value "${value}" for param "${param_name}" is unacceptable.`,
  details: {param_name, value}
})
// User Auth
module.exports.UserInfoInvalidError = ({user_id}) => new Packet({
  title: "UserInfoInvalidError",
  message: `user_id "${user_id}" or password is invalid.`,
  user_id,
  is_error: true
})
module.exports.UserIdHasRegisteredError = ({user_id}) => new Packet({
  title: "UserIdHasRegisteredError",
  message: `user_id "${user_id}" has already taken.`,
  user_id,
  is_error: true
})
module.exports.SignInRequiredError = () => new Packet({
  title: "SignInRequiredError",
  message: 'signin is required for your request.',
  is_error: true
})
module.exports.PermissionError = ({permission}) => new Packet({
  title: "PermissionError",
  message: `required ${permission}`,
  is_error: true
})
// App Auth
module.exports.AppInfoInvalidError = ({app_id, app_secret}) => new Packet({
  title: "AppInfoInvalidError",
  message: `app_id "${app_id}" or app_secret is invalid.`,
  app_id, 
  app_secret,
  is_error: true
})
module.exports.AppIdHasRegisteredError = ({app_id}) => new Packet({
  title: "AppIdHasRegisteredError",
  message: `app_id "${app_id}" has already taken.`,
  app_id,
  is_error: true
})
// App Token
module.exports.AppTokenInvalidError = ({app_id, app_token}) => new Packet({
  title: "AppTokenInvalidError",
  message: `app_id "${app_id}" or app_token is invalid.`,
  app_id,
  app_token,
  is_error: true
})
// Access Token
module.exports.AccessTokenInvalidError = ({access_token}) => new Packet({
  title: "AccessTokenInvalidError",
  message: `access_token is invalid.`,
  access_token,
  is_error: true
})
module.exports.RequestedUriNotSetError = () => new Packet({
  title: "RequestedUriNotSetError",
  message: 'redirect is not set',
  is_error: true
})