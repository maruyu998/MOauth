module.exports = class {
  constructor({
    title, message, is_error, status, from_error,
    redirect_uri, details,
    app_id, app_token, app_secret, user_id, access_token
  }){
    const obj = arguments[0]
    if(obj.title===undefined) obj.title=""
    if(obj.message===undefined) obj.message=""
    if(obj.is_error===undefined) obj.is_error=false
    if(obj.status===undefined) obj.status=200
    if(obj.from_error===undefined) obj.from_error=false
    this.o = obj
    if(this.is_error()) console.error("[ERR]", this.json())
  }
  is_error = () => this.o.is_error
  json(){
    return Object.entries(this.o)
            .filter(([key,value])=>value!==undefined)
            .map(([key,value])=>({[key]:value}))
            .reduce((left,right)=>Object.assign(left, right), {})
  }
  static parse = (o) => new module.exports(o)
  static from_error = (error, status=500) => {
    if(error instanceof module.exports) return error
    if(error instanceof Error) return new module.exports({
      title:error.name, message:error.message, 
      details:{
        error,
        stack: error.stack.split('\n')
      }, is_error:true, status, from_error:true
    })
    return new module.exports({
      title: "UndefinedError",
      message: `undefined error was happened.`,
      details: {error}
    })    
  }
  send(response){ response.status(this.o.status).json(this.json()) }
}