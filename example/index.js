const path = require('path')
const config = require('../')

const configPath = path.join(__dirname, 'config')

console.log(`========== env: ${process.env.NODE_ENV} ==========`)
console.log(config)

console.log(`========== env: com.somewind.domain1.dev ==========`)
console.log(config.parse(configPath, 'com.somewind.domain1.dev'))

console.log(`========== env: domain1.dev ==========`)
console.log(config.parse(configPath, 'domain1.dev'))

console.log(`========== env: pro ==========`)
console.log(config.parse(configPath, 'pro'))
