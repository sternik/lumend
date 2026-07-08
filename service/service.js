const pkgInfo = require('./package.json')
const Service = require('webos-service')
const { handleProxyRequest } = require('./proxy')

const service = new Service(pkgInfo.name)

service.register('request', handleProxyRequest)

console.log(`${pkgInfo.name} service started`)
