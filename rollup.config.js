const browsers = [
  'last 2 versions',
  '> 5%',
  'Android >= 5',
  'Chrome >= 55',
  'ie >= 10',
  'edge >= 11',
  'iOS >= 8',
]

// these will be added in later
import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import pkg from './package.json'

const globals = {
  document: 'document',
  window: 'window',
}

const config = {
  name: 'storagedb',
  input: 'src/storagedb.js',
  options: {
    useStrict: true,
  },
  banner: `
/*!
 * StorageDB JavaScript Library v${pkg.version}
 * https://github.com/tjbenton/storagedb
 */
  `,
  external: Object.keys(globals),
  globals,
  plugins: [
    babel({
      babelrc: false,
      presets: [
        [
          'env',
          {
            targets: { browsers },
            modules: false,
          },
        ],
      ],
      plugins: [
        // this removes support for Symbols which we don't need and makes the code smaller
        'transform-for-of-array',
      ],
      runtimeHelpers: false,
      externalHelpers: false,
      // doesn't compile node_modules which results in smaller file
      exclude: 'node_modules/**',
    }),
  ],
  context: 'window',
}

function extendConfig(output, cb) {
  let result = Object.assign({}, config)
  result = Object.assign({}, result, { output })
  if (cb) {
    result.presets = [].concat(result.presets)
    result.plugins = [].concat(result.plugins)
    cb(result)
  }
  return result
}

module.exports = [
  extendConfig({ file: 'dist/storagedb.js', format: 'cjs' }), // common js
  extendConfig({ file: 'dist/storagedb.es.js', format: 'es' }), // esnext
  extendConfig({ file: 'dist/storagedb.browser.js', format: 'iife' }), // browser
  extendConfig({ file: 'dist/storagedb.browser.min.js', format: 'iife' }, (obj) => { // minified browser iife
    obj.plugins.push(uglify())
  }),
]
