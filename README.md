# config-json5

## Simple Usage

### Configuration files

Put configuration files in `config` which is at project root dir.

```js
config/advanced/com/somewind/default.js
config/advanced/com/default.js
config/advanced/com/somewind.json
config/advanced/com.somewind/default.js
config/advanced/com.somewind/domain1.dev.json
config/advanced/com.somewind/domain1.js
config/advanced/com.somewind/domain2.json
config/advanced/com.somewind.json
config/advanced/default.js
config/default.json
config/default.json5
```

When `process.env.NODE_ENV` is `com.somewind.domain1.dev` or `domain1.dev`, it will merge the following configurations in a top-down order.(use `lodash.merge`, array is override)

```js
config/advanced/default.js
config/advanced/com/default.js
config/advanced/com/somewind.json
config/advanced/com.somewind.json
config/advanced/com/somewind/default.js
config/advanced/com.somewind/default.js
config/advanced/com.somewind/domain1.js
config/advanced/com.somewind/domain1.dev.json
config/default.json5
config/default.json
```

Note: 

* `config/advanced` is the advanced configuration, it overwrites step by step in `Namespace Order`.
* `config/*.EXT` is the highest priority configuration, follows the `Namespace Order`, and overrides the advanced configuration
* Same filename with different file ext, priority order is `json > json5 > js`.
* Different file paths, priority order is `. > /`
* `json` ext file format is same as `json5`.

### Import

```js
import config from 'config-json5'

config.Customer.dbConfig
config.get('Customer.dbConfig')
config.has('Customer.dbConfig')
```

## Custom Export

You can use custom `dirname` or `env` to manage your configuration.

```js
module1/config
module1/config/index.js
module1/config/default.js
```

`module1/config/index.js`

```js
import config from 'config-json5'
// option dirname, must be fullpath or [fullpath0, fullpath1, ...]
// option env, default is process.env.NODE_ENV
export default config(__dirname, process.env.TARGET, [arg1, arg2, ...argN])
```

Use parameter in config file.

```js
export default (arg1, arg2 ...argN) => ({
  Customer: {
    arg1: arg1
  }
})
```

Import from your export code.

```js
import config from './module1/config'

config.Customer.dbConfig
config.get('Customer.dbConfig')
config.has('Customer.dbConfig')
```

## Split Chunks

Configurations can be split in chunks.

```js
// default.json
{
  "app": {
    "name": "test",
    "port": 1234
  },
  "database": {
    "username": "root",
    "password": "1234"
  },
  "logger": {
    "level": "info"
  },
  "domain": "docs.config-json5.org"
}
```

`default.json` can be split into the following files

```js
// @.json
{
  "logger": {
    "level": "info"
  },
  "domain": "docs.config-json5.org"
}

// @app.json
{
  "name": "test",
  "port": 1234
}

// @database.json
{
  "username": "root",
  "password": "1234"
}
```


## License

[MIT](./LICENSE)
