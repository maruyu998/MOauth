const Packet = require("./packet")
const {
  ParamError,
  AppInfoInvalidError, AppTokenInvalidError,
  UserInfoInvalidError, AccessTokenInvalidError,
  UserIdHasRegisteredError, AppIdHasRegisteredError
} = require('./packets/servererror.js')

class Base {
  constructor({mongo_collection, data_type}){
    this.collection = mongo_collection
    this.data_type = data_type
  }
  insertOne = (object) => this.collection.insertOne({data_type:this.data_type, ...object})
                          .catch(e=>{throw Packet.from_error(e)})
  findOne = (query) => this.collection.findOne({data_type:this.data_type, ...query})
                          .catch(e=>{throw Packet.from_error(e)})
  find = (query) => this.collection.find({data_type:this.data_type, ...query}).toArray()
                          .catch(e=>{throw Packet.from_error(e)})
  deleteMany = (query) => this.collection.deleteMany({data_type:this.data_type, ...query})
                          .catch(e=>{throw Packet.from_error(e)})
  updateOne = (query,update) => this.collection.updateOne({data_type:this.data_type, ...query}, update)
                          .catch(e=>{throw Packet.from_error(e)})
}
class AppAuth {
  constructor({mongo_collection}){
    this.collection = new Base({mongo_collection, data_type:'app_auth'})
  }
  check_unique_app = ({app_id}) => {
    if(app_id==undefined) throw ParamError({param_name:"app_id", value:app_id})
    return this.collection.findOne({app_id, rejected:false})
            .then(app=>{ if(app) throw AppIdHasRegisteredError({app_id}) })
  }
  register_app_info = ({app_id, user_id, waiting_id, app_secret}) => this.check_unique_app({app_id})
          .then(()=>this.collection.insertOne({
            app_id, app_secret, user_id, waiting_id,
            approved: false, rejected: false, registered_at: new Date()
          }))
  validate_app_info = ({app_id, app_secret}) => this.collection.findOne({app_id, app_secret})
          .then(app=>{
            if(app) return app
            throw AppInfoInvalidError({app_id, app_secret})
          })
  get_waiting_apps = () => this.collection.find({approved:false, rejected:false}).then(apps=>({apps}))
  get_waiting_app = ({waiting_id}) => this.collection.findOne({waiting_id, approved:false, rejected:false})
  approve_waiting_app = ({waiting_id, user_id}) => this.collection.updateOne({waiting_id},{
      $set:{approved:true, approved_by:user_id, approved_at: new Date()},
      $unset:{waiting_id:""}
    })
  reject_waiting_app = ({waiting_id, user_id}) => this.collection.updateOne({waiting_id},{
      $set:{rejected:true, rejected_by:user_id, rejected_at: new Date()},
      $unset:{waiting_id:""}
    })
}
class AppToken {
  constructor({mongo_collection, expiration_duration}){
    this.collection = new Base({mongo_collection, data_type:'app_token'})
    this.expiration_duration = expiration_duration || {minutes:5}
  }
  delete_old_app_token = () => this.collection.deleteMany({expired_at:{$lt: new Date()}})
  register_app_token = ({app_id, app_token, expired_at}) => this.delete_old_app_token()
      .then(()=>this.collection.insertOne({
        app_id, app_token, expired_at: expired_at || (new Date()).add(this.expiration_duration)
      }))
  validate_app_token = ({app_id, app_token}) => this.delete_old_app_token()
      .then(()=>this.collection.findOne({app_id, app_token}))
      .then(app=>{
        if(app) return app
        throw AppTokenInvalidError({app_id, app_token})
      })
}
class UserAuth {
  constructor({mongo_collection}){
    this.collection = new Base({mongo_collection, data_type:'user_auth'})
  }
  check_unique_user = ({user_id}) => {
    if(user_id==undefined) throw ParamError({param_name:'user_id', value:user_id})
    return this.collection.findOne({ user_id, rejected:false })
            .then(app=>{ if(app) throw UserIdHasRegisteredError({user_id}) })
  }
  register_user_info = ({user_id, pass_hash, permission, waiting_id}) => this.check_unique_user({ user_id })
            .then(()=>this.collection.insertOne({
              user_id, pass_hash, waiting_id, 
              approved: false, rejected: false,
              permission: permission||[], registered_at: new Date()
            }))
  validate_user_info = ({user_id, pass_hash}) => this.collection.findOne({ user_id, pass_hash })
                                        .then(user=>{ if(user) return user; throw UserInfoInvalidError({user_id}) })
  get_permissions = ({user_id}) => this.collection.findOne({user_id}).then(user=>user.permissions)
  add_permissions = ({user_id, permissions}) => this.collection.updateOne({user_id},{$addToSet:{permissions:{$each:permissions}}})
  get_waiting_users = () => this.collection.find({approved:false, rejected:false}).then(users=>({users}))
  get_waiting_user = ({waiting_id}) => this.collection.findOne({waiting_id, approved:false, rejected:false})
  approve_waiting_user = ({waiting_id, user_id}) => this.collection.updateOne({waiting_id},{
      $set:{approved:true, approved_by:user_id, approved_at: new Date()},
      $unset:{waiting_id:""}
    })
  reject_waiting_user = ({waiting_id, user_id}) => this.collection.updateOne({waiting_id},{
      $set:{rejected:true, rejected_by:user_id, rejected_at: new Date()},
      $unset:{waiting_id:""}
    })
}

class AccessToken {
  constructor({mongo_collection, expiration_duration}){
    this.collection = new Base({mongo_collection, data_type:'access_token'})
    this.expiration_duration = expiration_duration || {minutes:5}
  }
  delete_old_access_token = () => this.collection.deleteMany({expired_at:{$lt: new Date()}})
  register_access_token = ({user_id, app_id, access_token, expired_at}) => this.delete_old_access_token()
    .then(()=>this.collection.insertOne({
      user_id, app_id, access_token, expired_at: expired_at || (new Date()).add(this.expiration_duration)
    }))
  validate_access_token = async ({access_token}) => this.delete_old_access_token()
    .then(()=>this.collection.findOne({ access_token }))
    .then(access=>{
      if(access) return access
      throw AccessTokenInvalidError({access_token})
    })
}

module.exports = class {
  constructor({mongo_collection, app_token_expiration_duration, access_token_expiration_duration}){
    this.app_auth = new AppAuth({mongo_collection})
    this.app_token = new AppToken({mongo_collection, app_token_expiration_duration})
    this.user_auth = new UserAuth({mongo_collection})
    this.access_token = new AccessToken({mongo_collection, access_token_expiration_duration})
  }
  register_app_info = (o) => this.app_auth.register_app_info(o)
  validate_app_info = (o) => this.app_auth.validate_app_info(o)

  register_app_token = (o) => this.app_token.register_app_token(o)
  validate_app_token = (o) => this.app_token.validate_app_token(o)

  register_user_info = (o) => this.user_auth.register_user_info(o)
  validate_user_info = (o) => this.user_auth.validate_user_info(o)
  
  register_access_token = (o) => this.access_token.register_access_token(o)
  validate_access_token = (o) => this.access_token.validate_access_token(o)
  
  get_permissions = (o) => this.user_auth.get_permissions(o)
  add_permissions = (o) => this.user_auth.add_permissions(o)

  get_waitings = () => Promise.all([this.user_auth.get_waiting_users(),
                                    this.app_auth.get_waiting_apps()])
                      .then(([{users}, {apps}])=>({users, apps}))
                      .catch(e=>{throw Packet.from_error(e)})

  get_waiting = ({waiting_id}) => Promise.all([this.user_auth.get_waiting_user({waiting_id}),
                                                this.app_auth.get_waiting_app({waiting_id})])
                                  .then(([user,app])=>(user||app))
                                  .catch(e=>{throw Packet.from_error(e)})

  approve_waiting_app = (o) => this.app_auth.approve_waiting_app(o)
  reject_waiting_app = (o) => this.app_auth.reject_waiting_app(o)
  approve_waiting_user = (o) => this.user_auth.approve_waiting_user(o)
  reject_waiting_user = (o) => this.user_auth.reject_waiting_user(o)
}
