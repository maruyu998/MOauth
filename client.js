const querystring = require('querystring')
const { extract, post, get_fulldomain } = require('./utils.js')
const Packet = require('./packet.js')
const session = require('./session.js')
const { AppInfoInvalidError } = require('./packets/servererror.js')

class Base {
  constructor({
    app_token_issue_server_uri, user_signin_server_uri, 
    access_token_validate_server_uri, callback_path,
    app_id, app_secret
  }){
    this.app_token_issue_server_uri = app_token_issue_server_uri
    this.user_signin_server_uri = user_signin_server_uri
    this.access_token_validate_server_uri = access_token_validate_server_uri
    this.callback_path = callback_path
    this.app_id = app_id
    this.app_secret = app_secret
  }
  get_signin_info = ({express_session}) => {
    return Promise.all([
            session.get_access_token(express_session),
            session.get_user_id(express_session)
          ]).then(([access_token,user_id])=>{access_token, user_id})
  }
  save_requested_uri = ({express_session, requested_uri}) => {
    return session.set_requested_uri(express_session, requested_uri)
  }
  get_app_token = () => {
    return post(this.app_token_issue_server_uri, {
      app_id:this.app_id, app_secret:this.app_secret
    })
    .then(packet=>extract(packet.json(),['app_token']))
    .catch(e=>{throw Packet.from_error(e)})
  }
  redirect_to_signin = ({express_request, express_response, app_token}) => {
    const query = querystring.stringify({
      app_id:this.app_id, app_token, redirect_uri:get_fulldomain(express_request)+this.callback_path
    })
    express_response.redirect(`${this.user_signin_server_uri}?${query}`)
  }
  validate_access_token = ({access_token}) => {
    return post(this.access_token_validate_server_uri, {access_token})
      .then(packet=>extract(packet.json(), ['user_id']))
      .then(({user_id})=>({user_id, access_token}))
  }
  save_signin_info = ({express_session, user_id, access_token}) => {
    session.set_user_id(express_session, user_id)
    session.set_access_token(express_session, access_token)
  }
  redirect_to_requested_uri = ({express_response, express_session}) => {
    session.get_requested_uri(express_session)
      .then(requested_uri=>express_response.redirect(requested_uri))
      .then(()=>session.unset_requested_uri(express_session))
  }
}
module.exports = class {
  constructor({
    app_token_issue_server_uri, user_signin_server_uri, 
    access_token_validate_server_uri, callback_path,
    app_id, app_secret
  }){
    if(app_token_issue_server_uri==undefined) throw Error('app_token_issue_server_uri is required.')
    if(user_signin_server_uri==undefined) throw Error('user_signin_server_uri is required.')
    if(access_token_validate_server_uri==undefined) throw Error('access_token_validate_server_uri is required.')
    if(callback_path==undefined) throw Error('callback_path is required.')
    if(app_id==undefined) throw Error('app_id is required.')
    if(app_secret==undefined) throw Error('app_secret is required.')

    this.base = new Base({
      app_token_issue_server_uri, user_signin_server_uri, 
      access_token_validate_server_uri, callback_path,
      app_id, app_secret
    })
  }
  redirect_signin_page_if_not_login = (request, response, next) => {
    this.base.get_signin_info({express_session: request.session}).then(()=>next())
    .catch(packet=>{
      this.base.save_requested_uri({express_session: request.session, requested_uri: get_fulldomain(request)+request.originalUrl})
      this.base.get_app_token()
      .then(({app_token})=>this.base.redirect_to_signin({express_request:request, express_response: response, app_token}))
      .catch(e=>Packet.from_error(e).send(response))
    })
  }
  redirect_requested_page_from_callback_path = (request, response, next) => {
    extract(request.query,['access_token'])
    .then(({access_token})=>this.base.validate_access_token({access_token}))
    .then(({user_id, access_token})=>this.base.save_signin_info({express_session: request.session, user_id, access_token}))
    .then(()=>this.base.redirect_to_requested_uri({express_response: response, express_session: request.session}))
    .catch(e=>Packet.from_error(e).send(response))
  }
}
