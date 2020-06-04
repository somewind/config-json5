const fs = require('fs')
const path = require('path')
const lodash = require('lodash')
const JSON5 = require('json5')
const yaml = require('js-yaml')

const loadYaml = (yamlPath) => {
  try {
    const file = fs.readFileSync(yamlPath, 'utf8')
    const config = yaml.safeLoad(file)
    return config
  } catch (e) {
    throw e
  }
}

const loadJSON5 = (json5Path) => {
  let file
  try {
    file = fs.readFileSync(json5Path, 'utf8')
  } catch (e) {
    throw e
  }
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
  '.json',
  '.yaml'
]

const defaultConfigNames = [
  'default.js',
  'default.json5',
  'default.json'
]

const fileParsers = {
  '.js': loadJS,
  '.json': loadJSON5,
  '.json5': loadJSON5,
  '.yaml': loadYaml
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
      if (extOrder.indexOf(path.extname(filename)) !== -1) {
        allConfigNames.push(filename)
      }
    }
  })
  return allConfigNames
}

const getConfigFilenames = (dirname, env) => {
  const allConfigFilenames = getAllConfigFilenames(dirname)

  const getCurrentConfigName = () => {
    const pathSepReg = path.sep === '/' ? /\//g : /\\/g
    const allConfigNames = allConfigFilenames
      .map(filename => filename.replace(pathSepReg, '.'))

    // 1. startsWith match
    let allConfigNamesWithFilter = allConfigNames
      .filter(configFilename => configFilename.startsWith(env))
    if (allConfigNamesWithFilter.length !== 0) {
      const currentConfigName = lodash.minBy(allConfigNamesWithFilter, configFilename => configFilename.length)
      const lastDotIndex = currentConfigName.lastIndexOf('.')
      if (lastDotIndex !== -1) {
        // remove ext
        const envCompute = currentConfigName.substring(0, lastDotIndex)
        if (envCompute !== env) {
          // return a fake file
          return `${env}.js`
        }
      }
    }

    // 2. includes match (with out .@xxx files)
    if (allConfigNamesWithFilter.length === 0) {
      allConfigNamesWithFilter = allConfigNames
        .filter(configFilename => configFilename.includes(env) && !/.@[a-zA-Z.]/.test(configFilename))
    }

    // 3. includes match (with .@xxx files)
    if (allConfigNamesWithFilter.length === 0) {
      // try get @ configs
      allConfigNamesWithFilter = allConfigNames
        .filter(configFilename => configFilename.includes(env))
        .map(configFilename => {
          const startIndex = configFilename.indexOf('.@')
          return `${configFilename.substr(0, startIndex)}.js`
        })
    }

    const currentConfigName = lodash
      .minBy(allConfigNamesWithFilter, configFilename => configFilename.length)

    return currentConfigName
  }

  const currentConfigName = getCurrentConfigName()
  const shouldApplyConfigFilenames = []

  const addDefaultFiles = (namespace, prepareForNext) => {
    const namespaceDir = path.join(dirname, namespace)
    if (fileAccessible(namespaceDir)) {
      const stat = fs.statSync(namespaceDir)
      if (stat.isDirectory()) {
        prepareForNext && prepareForNext.push(namespace + path.sep)
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
  }

  const addNamespaceFiles = (namespace) => {
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
  }

  // add default configs in root
  addDefaultFiles('')

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

        addNamespaceFiles(namespace)
      })

      // add default files
      parentPaths.forEach(parentPath => {
        const namespace = `${parentPath}${s}`

        addDefaultFiles(namespace, prepareForNext)

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
