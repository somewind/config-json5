
interface Config {
  [key: string]: any
  /**
   * Check if propertyPath has config.
   * @param {string} propertyPath The path of the property to check.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   * @example
   * 
   * config.has('Customer.dbConfig')
   */
  has(propertyPath: string): boolean
  /**
   * Get config from propertyPath.
   * @param {string} propertyPath The path of the property to get.
   * @returns {any}  Returns the resolved value.
   * @example
   * 
   * config.get('Customer.dbConfig')
   */
  get(propertyPath: string): any
  /**
   * Use env to parse config dirs.
   * @param {string|string[]} dirnames Configuration files dirs, it should be full path, default is `process.cwd() + 'config'`.
   * @param {string} env default is `process.env.NODE_ENV || 'default'`.
   * @param {any|any[]} injectArgs Config files export default function, will inject args, default is `[]`.
   * @returns {Config} Returns config
   * @example
   * 
   * config.parse(__dirname, process.env.TARGET, [arg1, arg2, ...argN])
   */
  parse(dirnames: string | string[], env?: string, injectArgs?: any|any[]): Config
}

declare const config: Config

export = config
