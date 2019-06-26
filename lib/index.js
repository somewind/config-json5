const fs = require('fs')
const path = require('path')
const lodash = require('lodash')
const JSON5 = require('json5')

const loadJSON5 = (json5Path) => {
  const file = fs.readFileSync(json5Path, 'utf8')
  try {
    const config = JSON5.parse(file)
    return config
  } catch (e) {
    // add error config path to stack, easy to find error
    const lines = e.stack.split('\n')
    lines.splice(1, 0, `    at syntaxError (${json5Path}:${e.lineNumber}:${e.columnNumber})`)
    e.stack = lines.join('\n')
    throw e
  }
}

const loadJS = (jsPath) => {
  try {
    const config = require(jsPath)
    return config.default ? config.default : config
  } catch (e) {
    throw e
  }
}

const extOrder = [
  '.json',
  '.json5',
  '.js'
]

const defaultConfigNames = [
  'default.json',
  'default.json5',
  'default.js'
]

const fileParsers = {
  '.js': loadJS,
  '.json': loadJSON5,
  '.json5': loadJSON5
}

const fileAccessible = (filename) => {
  try {
    fs.accessSync(filename)
    return true
  } catch (e) {
    return false
  }
}

const getConfigFilenames = (dirname, env) => {
  const configFilenames = fs.readdirSync(dirname)
  const configFilenamesWithFilter = configFilenames.filter(configFilename => configFilename.includes(env))
  const currentConfigFilename = lodash.minBy(configFilenamesWithFilter, configFilename => configFilename.length)
  const shouldApplyConfigFilenames = []

  if (currentConfigFilename) {
    const subnames = currentConfigFilename.split('.')
    // remove ext
    subnames.splice(subnames.length - 1, 1)
    subnames.forEach((s, i) => {
      const parentNamespace = subnames.slice(0, i + 1).join('.')
      extOrder.forEach(ext => {
        const name = `${parentNamespace}${ext}`
        if (!defaultConfigNames.includes(name)) {
          const filename = path.join(dirname, name)
          if (fileAccessible(filename)) {
            shouldApplyConfigFilenames.push(filename)
          }
        }
      })
    })
  }
  // add defaults
  shouldApplyConfigFilenames.splice(
    0,
    0,
    ...defaultConfigNames
      .filter(dcn => configFilenames.includes(dcn))
      .map(dcn => path.join(dirname, dcn)))
  return shouldApplyConfigFilenames
}

const mergeConfig = (config, dirname, env) => {
  const configFilenames = getConfigFilenames(dirname, env)
  const configList = configFilenames.map(filename => {
    const ext = path.extname(filename)
    const fileParser = fileParsers[ext]
    if (fileParser) {
      const config = fileParser(filename)
      return config
    } else {
      throw new Error(`${filename} The file format cannot be recognized.`)
    }
  })
  config = lodash.merge(config, ...configList)
  return config
}

let config = {}

const configJSON5 = (dirname = `${process.cwd()}/config`, env = process.env.NODE_ENV || 'default') => {
  // remove old properties
  Object.keys(config).forEach((k) => {
    delete configJSON5[k]
  })
  config = {}

  const advancedDirname = path.join(dirname, 'advanced')
  if (fileAccessible(advancedDirname)) {
    config = mergeConfig(config, advancedDirname, env)
  }

  if (fileAccessible(dirname)) {
    config = mergeConfig(config, dirname, env)
  }

  // map config properties
  Object.entries(config).forEach(([k, v]) => {
    configJSON5[k] = v
  })

  // set accessor
  configJSON5.get = (propertyPath) => {
    if (!propertyPath) {
      return config
    }
    return lodash.get(config, propertyPath)
  }
  configJSON5.has = (propertyPath) => {
    if (!propertyPath) {
      return true
    }
    return lodash.has(config, propertyPath)
  }

  return configJSON5
}

configJSON5()

module.exports = configJSON5
