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

const loadJS = (jsPath, injectArgs) => {
  try {
    const config = require(jsPath)
    const mod = config.default ? config.default : config
    if (typeof mod !== 'function') {
      return mod
    }
    return mod(...injectArgs)
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

const getAllConfigFilenames = (dirname) => {
  const filenames = fs.readdirSync(dirname)
  const allConfigNames = []
  filenames.forEach(filename => {
    const fullFilename = path.join(dirname, filename)
    const stat = fs.statSync(fullFilename)
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(filename)) {
        const subConfigNames = getAllConfigFilenames(fullFilename)
        allConfigNames.push(...subConfigNames.map(scn => path.join(filename, scn)))
      }
    } else {
      allConfigNames.push(filename)
    }
  })
  return allConfigNames
}

const getConfigFilenames = (dirname, env) => {
  const allConfigFilenames = getAllConfigFilenames(dirname)
  const pathSepReg = path.sep === '/' ? /\//g : /\\/g
  const allConfigNames = allConfigFilenames
    .map(filename => filename.replace(pathSepReg, '.'))

  const allConfigNamesWithFilter = allConfigNames
    .filter(configFilename => configFilename.includes(env) && !configFilename.includes('@'))

  const currentConfigName = lodash
    .minBy(allConfigNamesWithFilter, configFilename => configFilename.length)

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

      // add namespace files
      parentPaths.forEach(parentPath => {
        const namespace = `${parentPath}${s}`

        // namespace.js
        // namespace.json5
        // namespace.json
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

      // add default files
      parentPaths.forEach(parentPath => {
        const namespace = `${parentPath}${s}`

        const namespaceDir = path.join(dirname, namespace)
        if (fileAccessible(namespaceDir)) {
          const stat = fs.statSync(namespaceDir)
          if (stat.isDirectory()) {
            prepareForNext.push(namespace + path.sep)
            // namespace/@****.js
            // namespace/@****.json5
            // namespace/@****.json
            const chunkStart = path.join(namespace, '@')
            allConfigFilenames
              .filter(filename => filename.startsWith(chunkStart))
              .sort((a, b) => {
                const exta = path.extname(a)
                const extb = path.extname(b)
                const compare = extOrder.indexOf(exta) - extOrder.indexOf(extb)
                if (compare !== 0) {
                  return compare
                }
                const basenamea = path.basename(a)
                const basenameb = path.basename(b)
                return basenameb.length - basenamea.length
              })
              .forEach(filename => shouldApplyConfigFilenames.push(path.join(dirname, filename)))

            // namespace/default.js
            // namespace/default.json5
            // namespace/default.json
            defaultConfigNames.forEach(dcn => {
              const filename = path.join(dirname, namespace, dcn)
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

const mergeConfig = (config, dirname, env, injectArgs) => {
  const configFilenames = getConfigFilenames(dirname, env)
  const configList = configFilenames.map(filename => {
    const pathObj = path.parse(filename)
    const fileParser = fileParsers[pathObj.ext]
    if (fileParser) {
      const config = fileParser(filename, injectArgs)
      if (!pathObj.name.startsWith('@')) {
        return config
      }

      const subpath = pathObj.name.substr(1)
      if (subpath === '') {
        return config
      }

      return {
        [subpath]: config
      }
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

/**
 *
 * @param {String|Array<String>} dirnames full path
 * @param {String} env
 * @param {any|Array<any>} injectArgs config.js file export default a function, will inject args
 */
const configJSON5 = (dirnames = path.join(process.cwd(), 'config'), env = process.env.NODE_ENV || 'default', injectArgs = []) => {
  config = {}

  if (typeof dirnames === 'string') {
    dirnames = [dirnames]
  }

  if (!Array.isArray(injectArgs)) {
    injectArgs = [injectArgs]
  }

  dirnames.forEach((dirname) => {
    const advancedDirname = path.join(dirname, 'advanced')
    if (fileAccessible(advancedDirname)) {
      config = mergeConfig(config, advancedDirname, env, injectArgs)
    }

    if (fileAccessible(dirname)) {
      config = mergeConfig(config, dirname, env, injectArgs)
    }
  })

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
