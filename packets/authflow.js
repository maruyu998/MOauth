const Packet = require("../packet.js");

// User Auth
module.exports.UserRegistered = ({user_id, redirect_uri}) => new Packet({
  title: "UserRegistered",
  message: `"${user_id}" was registered in waiting list. `
          +`If you have to register immediately, please contact the administrator.`,
  redirect_uri
})
module.exports.UserApproved = ({user_id}) => new Packet({
  title: "UserApproved",
  message: `"${user_id}" was approved. You can sign in from now on.`,
  user_id
})
module.exports.UserRejected = ({user_id}) => new Packet({
  title: "UserRejected",
  message: `"${user_id}" was rejected.`,
  user_id
})
module.exports.UserSignedIn = ({user_id, redirect_uri, user_token}) => new Packet({
  title: "UserSignedIn",
  message: `"${user_id}" was signed in.`,
  user_id, user_token, redirect_uri
})
module.exports.UserPermission = ({app_id, user_id, permissions}) => new Packet({
  title: "UserPermission",
  message: `user permission packet`,
  app_id, user_id, 
  details: {permissions}
})
module.exports.UserInfo = ({user_id}) => new Packet({
  title: "UserInfo",
  message: 'user info packet',
  user_id
})
// App Auth
module.exports.AppRegistered = ({app_id, user_id}) => new Packet({
  title: "AppRegistered",
  message: `your application ${app_id} is registered, whose owner account is ${user_id}.`,
  app_id, user_id
})
module.exports.AppApproved = ({app_id}) => new Packet({
  title: "AppApproved",
  message: `app_id "${app_id}" app is approved`,
  app_id
})
module.exports.AppRejected = ({app_id}) => new Packet({
  title: "AppRejected",
  message: `app_id "${app_id}" app is rejected`,
  app_id
})
// App Token
module.exports.AppTokenIssued = ({app_id, app_token}) => new Packet({
  title: "AppTokenIssued",
  message: `"${app_id}"'s app_token was issued. `
          +`app_token is used for user's registering or signing in by an application server.`,
  app_id, app_token
})
// Access Token
module.exports.AccessTokenIssued = ({app_id, user_id, access_token, redirect_uri}) => new Packet({
  title: "AccessTokenIssued",
  message: `access token was issued for user "${user_id}" in app "${app_id}" scope.`,
  app_id, user_id, access_token, redirect_uri
})
module.exports.AccessTokenValidated = ({app_id, user_id, access_token}) => new Packet({
  title: "AccessTokenValidated",
  message: `access_token was validated for user "${user_id}" and app "${app_id}".`,
  app_id, user_id, access_token  
})
// User Auth, App Auth > waitings 
module.exports.Waitings = ({users, apps}) => new Packet({
  title: "Waitings",
  message: `there are ${apps.length} apps and ${users.length} users waiting.`,
  details: { users, apps }
})

module.exports.Logs = ({logs}) => new Packet({
  title: "Logs",
  message: `there are ${logs.length} logs.`,
  details: { logs }
})