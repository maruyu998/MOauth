const Mongo = require('./mongo.js')
const Packet = require('./packet.js')
const session = require('./session.js')
const { random, hash, extract, get_fulldomain } = require('./utils.js')
const { 
  AppTokenIssued, 
  AccessTokenIssued, 
  AccessTokenValidated, 
  UserRegistered,
  Waitings, UserInfo,
  AppApproved, UserApproved, AppRejected, UserRejected, AppRegistered,
  Logs
} = require('./packets/authflow.js')
const { ParamError, PermissionError } = require('./packets/servererror.js')

class Base {
  constructor({
    mongo_collection, hash_salt,
    access_token_length,
    app_secret_length,
    app_token_length,
    waiting_id_length,
    app_token_expiration_duration,
    access_token_expiration_duration
  }){
    app_token_expiration_duration = app_token_expiration_duration || {minutes:5}
    access_token_expiration_duration = access_token_expiration_duration || {minutes:5}
    this.mongo = new Mongo({mongo_collection, app_token_expiration_duration, access_token_expiration_duration})
    this.hash_salt = hash_salt
    this.access_token_length = access_token_length || 50
    this.app_secret_length = app_secret_length || 50
    this.app_token_length = app_token_length || 50
    this.waiting_id_length = waiting_id_length || 50
  }
  record_log = ({ip, url, app_id, app_token, user_id, password, redirect_uri}) => {
    const pass_hash = hash({text:password, salt:this.hash_salt})
    return this.mongo.register_log({ip, url, app_id, app_token, user_id, pass_hash, redirect_uri})
  }
  get_logs = () => this.mongo.get_logs().then(({logs})=>Logs({logs}))
  issue_app_token = ({app_id, app_secret}) => {
    return this.mongo.validate_app_info({app_id, app_secret})
      .then(app=>{
        const app_token = random(this.app_token_length)
        return this.mongo.register_app_token({app_id, app_token})
                .then(()=>AppTokenIssued({app_id, app_token}))
      })
      .catch(e=>{throw Packet.from_error(e)})
  }
  require_permission = ({user_id, permission}) => {
    return this.mongo.get_permissions({user_id}).then(permissions=>{
              if(!permissions.includes(permission)) throw PermissionError({permission})
            })
  }
  get_waitings = () => this.mongo.get_waitings().then(({users, apps})=>Waitings({users, apps}))
  review_waiting = ({waiting_id, user_id, review}) => {
    if(review!='approve' && review!='reject') throw ParamError({param_name:'review', value:review})
    return this.mongo.get_waiting({waiting_id})
    .then(waiting=>{
      if(waiting.data_type=='app_auth')
        return extract(waiting, ['app_id']).then(({app_id})=>{
          if(review=='approve') return this.mongo.approve_waiting_app({waiting_id, user_id}).then(dbres=>AppApproved({app_id}))
          if(review=='reject') return this.mongo.reject_waiting_app({waiting_id, user_id}).then(dbres=>AppRejected({app_id}))
        })
      if(waiting.data_type=='user_auth')
        return extract(waiting, ['user_id']).then(({user_id})=>{
          if(review=='approve') return this.mongo.approve_waiting_user({waiting_id, user_id}).then(dbres=>UserApproved({user_id}))
          if(review=='reject') return this.mongo.reject_waiting_user({waiting_id, user_id}).then(dbres=>UserRejected({user_id}))
        })
    })
  }
  register_user_info = ({user_id, password}) => this.mongo.register_user_info({
      user_id, 
      pass_hash:hash({text:password, salt:this.hash_salt}), 
      waiting_id:random(this.waiting_id_length)
    }).then(dbresult=>UserRegistered({user_id, redirect_uri:''}))
  validate_access_token = ({access_token}) => this.mongo.validate_access_token({access_token})
    .then(access=>AccessTokenValidated({user_id: access.user_id, app_id:access.app_id, access_token}))
  issue_access_token = ({app_id, app_token, user_id, password, redirect_uri}) => this.mongo.validate_app_token({app_id, app_token})
    .then(app=>({ 
      pass_hash: hash({text:password, salt:this.hash_salt}), 
      access_token: random(this.access_token_length)
    }))
    .then(({pass_hash, access_token})=>Promise.all([
        this.mongo.validate_user_info({user_id, pass_hash}),
        this.mongo.register_access_token({user_id,app_id,access_token})
      ])
      .then(()=>AccessTokenIssued({access_token,user_id,app_id,redirect_uri}))
      .catch(e=>{throw e})
    ).catch(e=>{throw Packet.from_error(e)})
  register_app_info = ({app_id, user_id}) => this.mongo.register_app_info({
      user_id, app_id, 
      app_secret: random(this.app_secret_length), 
      waiting_id: random(this.waiting_id_length)
    })
  get_signed_in_user_info = ({express_session}) => session.get_user_id(express_session)
                                                  .then(user_id=>UserInfo({user_id}))
  store_access_token = ({express_session, user_id, access_token}) => {
    session.set_user_id(express_session, user_id)
    session.set_access_token(express_session, access_token)
  }
}

module.exports = class {
  constructor({
    mongo_collection, hash_salt,
    user_signin_server_path,
    app_id, app_secret,
    access_token_length, app_secret_length, app_token_length, waiting_id_length,
    app_token_expiration_duration, access_token_expiration_duration
  }){
    if(mongo_collection==undefined) throw Error("mongo_collection is required.")
    if(hash_salt==undefined) throw Error("hash_salt is required.")
    if(user_signin_server_path==undefined) throw Error("user_signin_server_path is required.")
    if(app_id==undefined) throw Error("app_id is required.")
    if(app_secret==undefined) throw Error("app_secret is required.")

    this.user_signin_server_path = user_signin_server_path
    this.app_id = app_id
    this.app_secret = app_secret
    this.base = new Base({
      mongo_collection, hash_salt, 
      access_token_length, app_secret_length, app_token_length, waiting_id_length,
      app_token_expiration_duration, access_token_expiration_duration
    })
  }
  record_log = (request, response, next) => {
    const url = request.protocol + '://' + request.get('host') + request.originalUrl;
    const ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    const app_id = request.body.app_id;
    const app_token = request.body.app_token;
    const user_id = request.body.user_id;
    const password = request.body.user_password;
    const redirect_uri = request.body.redirect_uri;
    this.base.record_log({ip,url,app_id,app_token,user_id,password,redirect_uri});
    next();
  }
  get_logs = (request, response, next) => {
    session.get_user_id(request.session)
    .then(user_id=>this.base.require_permission({user_id, permission: "BROWSER_LOGS"}))
    .then(()=>this.base.get_logs())
    .then(packet=>packet.send(response))
    .catch(packet=>Packet.from_error(packet).send(response))
  }
  require_signin = (request, response, next) => {
    session.get_user_id(request.session).then(()=>next())
    .catch(packet=>{
      const url = new URL(get_fulldomain(request)+this.user_signin_server_path)
      url.searchParams.append('redirect_uri', get_fulldomain(request)+request.originalUrl)
      response.redirect(url.href)
    })
  }
  issue_and_send_app_token = (request, response, next) => {
    extract(request.body, ['app_id', 'app_secret'])
    .then(({app_id, app_secret})=>this.base.issue_app_token({app_id, app_secret}))
    .then(packet=>packet.send(response)).catch(packet=>packet.send(response))
  }
  get_signed_in_user_info = (request, response, next) => {
    session.get_user_id(request.session)
    .then(user_id=>UserInfo({user_id}).send(response))
    .catch(packet=>packet.send(response))
  }
  get_waitings = (request, response, next) => {
    session.get_user_id(request.session)
    .then(user_id=>this.base.require_permission({user_id, permission: "BROWSE_WAITING"}))
    .then(()=>this.base.get_waitings())
    .then(packet=>packet.send(response))
    .catch(packet=>Packet.from_error(packet).send(response))
  }
  review_waiting = (request, response, next) => {
    session.get_user_id(request.session)
    .then(user_id=>this.base.require_permission({user_id,permission:"REVIEW_WAITING"})
      .then(()=>extract(request.body, ['waiting_id','review']))
      .then(({waiting_id, review})=>this.base.review_waiting({waiting_id, review, user_id}))
      .catch(e=>{throw e})
    )
    .then(packet=>packet.send(response))
    .catch(packet=>Packet.from_error(packet).send(response))  
  }
  app_register = (request, response, next) => {
    session.get_user_id(request.session)
    .then(user_id=>this.base.require_permission({user_id,permission:"REGISTER_APPLICATION"})
      .then(()=>extract(request.body, ['app_id']))
      .then(({app_id})=>this.base.register_app_info({app_id, user_id})
        .then(dbres=>AppRegistered({app_id, user_id})))
      .catch(e=>{throw e})
    )
    .then(packet=>packet.send(response))
    .catch(packet=>Packet.from_error(packet).send(response))    
  }
  signup_user = (request, response, next) => {
    extract(request.body,['user_id','password'])
    .then(({user_id, password})=>this.base.register_user_info({user_id, password}))
    .then(packet=>packet.send(response))
    .catch(packet=>Packet.from_error(packet).send(response))
  }
  validate_access_token = (request, response, next) => {
    extract(request.body, ['access_token'])
    .then(({access_token})=>this.base.validate_access_token({access_token}))
    .then(packet=>packet.send(response))
    .catch(packet=>Packet.from_error(packet).send(response))
  }
  get_access_token = (request, response, next) => {
    extract(request.body, ['app_id','app_token','user_id','password','redirect_uri'])
    .then(({app_id, app_token, user_id, password, redirect_uri})=>
        this.base.issue_access_token({app_id, app_token, user_id, password, redirect_uri})
        .then(packet=>{
          const access_token = packet.json().access_token
          this.base.store_access_token({express_session:request.session, user_id, access_token})
          return AccessTokenIssued({app_id, user_id, access_token, redirect_uri})
        }))
    .then(packet=>packet.send(response))
    .catch(packet=>Packet.from_error(packet).send(response))
  }
  redirect_to_added_app_token_uri = (request, response, next) => {
    extract(request.query, ['app_token']).then(()=>next())
    .catch(()=>this.base.issue_app_token({app_id: this.app_id, app_secret: this.app_secret})
      .then(packet=>{
        const { app_token, app_id } = packet.json()
        const url = new URL(get_fulldomain(request)+request.originalUrl)
        url.searchParams.append('app_token', app_token)
        url.searchParams.append('app_id', app_id)
        url.searchParams.append('redirect_uri', request.query.redirect_uri || get_fulldomain(request)+request.originalUrl)
        response.redirect(url.href)
      })
      .catch(e=>Packet.from_error(e).send(response))
    )
  }
}