const path = require('path')
const config = require('../')

const configPath = path.join(__dirname, '../example/config')

test('config load empty env=undefined', () => {
  expect(JSON.stringify(config.parse(configPath, undefined)))
    .toBe('{"name":"default.json","advanced/default.js":1,"default.json5":1,"default.json":1}')
})

test('config load fullname env=com.somewind.domain1.dev', () => {
  expect(JSON.stringify(config.parse(configPath, 'com.somewind.domain1.dev')))
    .toBe('{"name":"default.json","advanced/default.js":1,"advanced/com/default.js":1,"advanced/com/somewind.json":1,"advanced/com.somewind.json":1,"advanced/com/somewind/default.js":1,"advanced/com.somewind/default.js":1,"advanced/com.somewind/domain1.js":1,"advanced/com.somewind/domain1.dev.json":1,"default.json5":1,"default.json":1}')
})

test('config load subname env=domain1.dev', () => {
  expect(JSON.stringify(config.parse(configPath, 'domain1.dev')))
    .toBe('{"name":"default.json","advanced/default.js":1,"advanced/com/default.js":1,"advanced/com/somewind.json":1,"advanced/com.somewind.json":1,"advanced/com/somewind/default.js":1,"advanced/com.somewind/default.js":1,"advanced/com.somewind/domain1.js":1,"advanced/com.somewind/domain1.dev.json":1,"default.json5":1,"default.json":1}')
})

test('config load not exist env=pro', () => {
  expect(JSON.stringify(config.parse(configPath, 'pro')))
    .toBe('{"name":"default.json","advanced/default.js":1,"default.json5":1,"default.json":1}')
})

test('config load empty env=undefined, args=["hello", 123]', () => {
  expect(JSON.stringify(config.parse(configPath, undefined, ['hello', 123])))
    .toBe('{"name":"default.json","advanced/default.js":1,"args":"hello 123","default.json5":1,"default.json":1}')
})
