# config-json5

## Usage

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

When `process.env.NODE_ENV` is `com.somewind.domain1.dev` or `domain1.dev`, it will merge the following configurations in a top-dom order.(use `lodash.merge`)

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

### Advanced

you can use custom `dirname` or `env` to manage your configuration.

```js
module1/config
module1/config/index.js
module1/config/default.js
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
