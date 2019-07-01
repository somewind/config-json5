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

const excludeDirs = [
  'advanced'
]

const extOrder = [
  '.js',
  '.json5',
  '.json'
]

const defaultConfigNames = [
  'default.js',
  'default.json5',
  'default.json'
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

const getAllConfigNames = (dirname) => {
  const filenames = fs.readdirSync(dirname)
  const allConfigNames = []
  filenames.forEach(filename => {
    const fullFilename = path.join(dirname, filename)
    const stat = fs.statSync(fullFilename)
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(filename)) {
        const subConfigNames = getAllConfigNames(fullFilename)
        allConfigNames.push(...subConfigNames.map(scn => `${filename}.${scn}`))
      }
    } else {
      allConfigNames.push(filename)
    }
  })
  return allConfigNames
}

const getConfigFilenames = (dirname, env) => {
  const allConfigNames = getAllConfigNames(dirname)
  const allConfigNamesWithFilter = allConfigNames.filter(configFilename => configFilename.includes(env))
  const currentConfigName = lodash.minBy(allConfigNamesWithFilter, configFilename => configFilename.length)

  // add default configs in root
  const shouldApplyConfigFilenames = defaultConfigNames
    .filter(dcn => allConfigNames.includes(dcn))
    .map(dcn => path.join(dirname, dcn))

  // add namespace configs in path
  if (currentConfigName) {
    let parentPaths = ['']

    const subnames = currentConfigName.split('.')
    // remove ext
    subnames.splice(subnames.length - 1, 1)
    subnames.forEach((s, i) => {
      const prepareForNext = []

      // add file
      // namespace.js
      // namespace.json5
      // namespace.json
      parentPaths.forEach(parentPath => {
        const namespace = `${parentPath}${s}`

        extOrder.forEach(ext => {
          const name = `${namespace}${ext}`
          if (!defaultConfigNames.includes(name)) {
            const filename = path.join(dirname, name)
            if (fileAccessible(filename)) {
              shouldApplyConfigFilenames.push(filename)
            }
          }
        })
      })

      // add dir
      // namespace/default.js
      // namespace/default.json5
      // namespace/default.json
      parentPaths.forEach(parentPath => {
        const namespace = `${parentPath}${s}`

        const namespaceDir = path.join(dirname, namespace)
        if (fileAccessible(namespaceDir)) {
          const stat = fs.statSync(namespaceDir)
          if (stat.isDirectory()) {
            prepareForNext.push(namespace + '/')
            defaultConfigNames.forEach(dcn => {
              const filename = path.join(dirname, `${namespace}/${dcn}`)
              if (fileAccessible(filename)) {
                shouldApplyConfigFilenames.push(filename)
              }
            })
          }
        }
        prepareForNext.push(namespace + '.')
      })
      parentPaths = prepareForNext
    })
  }

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
  config = lodash.mergeWith(config, ...configList, (objValue, srcValue) => {
    if (Array.isArray(objValue)) {
      return srcValue
    }
  })
  return config
}

let config = {}

const configJSON5 = (dirname = `${process.cwd()}/config`, env = process.env.NODE_ENV || 'default') => {
  config = {}

  const advancedDirname = path.join(dirname, 'advanced')
  if (fileAccessible(advancedDirname)) {
    config = mergeConfig(config, advancedDirname, env)
  }

  if (fileAccessible(dirname)) {
    config = mergeConfig(config, dirname, env)
  }

  // set accessor
  config.get = (propertyPath) => {
    if (!propertyPath) {
      return config
    }
    return lodash.get(config, propertyPath)
  }
  config.has = (propertyPath) => {
    if (!propertyPath) {
      return true
    }
    return lodash.has(config, propertyPath)
  }
  config.parse = configJSON5

  return config
}

module.exports = configJSON5()
