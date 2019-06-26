# config-json5

## Usage

### Configuration files

Put configuration files in `config` which is at project root dir.

```js
..  config/
..    default.json
..    default.json5
..    advanced/
..      default.js
..      com.somewind.json
..      com.somewind.domain1.js
..      com.somewind.domain1.dev.json
..      com.somewind.domain2.json
```

When `process.env.NODE_ENV` is `com.somewind.domain1.dev` or `domain1.dev`, it will merge the following configurations in a top-dom order.(use `lodash.merge`)

```js
..  config/
..    advanced/
..      default.js
..      com.somewind.json
..      com.somewind.domain1.js
..      com.somewind.domain1.dev.json
..    default.json
..    default.json5
```

Same filename with different file ext, priority order is `js > json5 > json`.

`json` ext file format is same as `json5`.

### Import

```js
import config from 'config-json5'

config.Customer.dbConfig
config.get('Customer.dbConfig')
config.has('Customer.dbConfig')
```

### Advanced

you can use custom `dirname` or `env` to manage your configuration.

```js
..  module1/config
..      index.js
..      default.js
```

`module1/config/index.js`

```js
import config from 'config-json5'
// dirname must be full path
// env default is process.env.NODE_ENV
export default config(__dirname, process.env.TARGET)
```

import from your export code

```js
import config from './module1/config'

config.Customer.dbConfig
config.get('Customer.dbConfig')
config.has('Customer.dbConfig')
```

## License

[MIT](./LICENSE)
