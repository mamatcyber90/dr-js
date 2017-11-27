#!/usr/bin/env node

const nodeModulePath = require('path')
const nodeModuleFs = require('fs')
const { promisify } = require('util')
const Dr = require('../library/Dr.node')
const { createServerServeStatic } = require('./server-serve-static')

const __DEV__ = false

const readFileAsync = promisify(nodeModuleFs.readFile)
const {
  Common: { Module: { createOptionParser, OPTION_CONFIG_PRESET } },
  Node: { File: { modify, getFileList } }
} = Dr

const MODE_OPTION = [
  'env-info',
  'file-list',
  'file-modify-copy',
  'file-modify-move',
  'file-modify-delete',
  'server-serve-static'
]

const OPTION_CONFIG = {
  prefixENV: 'dr-js',
  formatList: [
    {
      name: 'config',
      shortName: 'c',
      optional: true,
      description: `# from JSON: set to path relative process.cwd()\n# from ENV: set to 'env' to collect from process.env`,
      ...OPTION_CONFIG_PRESET.SingleString
    },
    {
      name: 'mode',
      shortName: 'm',
      description: `should be one of [ ${MODE_OPTION.join(', ')} ]`,
      ...OPTION_CONFIG_PRESET.OneOfString(MODE_OPTION)
    },
    { name: 'argument', shortName: 'a', optional: true, argumentCount: '0+' }
  ]
}

const { parseCLI, parseENV, parseJSON, processOptionMap, formatUsage } = createOptionParser(OPTION_CONFIG)

const exitWithError = (error) => {
  __DEV__ && console.warn(error)
  console.warn(formatUsage(error.message || error.toString()))
  process.exit(1)
}

const main = async () => {
  let optionMap = optionMapResolvePath(parseCLI(process.argv), process.cwd())

  const getOption = (name, argumentCount) => {
    const argumentList = getOptionOptional(name) || exitWithError(new Error(`[option] missing option ${name}`))
    if (argumentCount !== undefined && argumentList.length !== argumentCount) exitWithError(new Error(`[option] expecting ${name} has ${argumentCount} value instead of ${argumentList.length}`))
    return argumentList
  }
  const getOptionOptional = (name) => optionMap[ name ] && optionMap[ name ].argumentList
  const getSingleOption = (name) => getOption(name, 1)[ 0 ]
  const getSingleOptionOptional = (name) => optionMap[ name ] && optionMap[ name ].argumentList[ 0 ]

  const config = getSingleOptionOptional('config')
  if (config && config.toLowerCase() === 'env') {
    const envOptionMap = optionMapResolvePath(parseENV(process.env), process.cwd())
    optionMap = { ...envOptionMap, ...optionMap }
  } else if (config) {
    const jsonOptionMap = optionMapResolvePath(parseJSON(JSON.parse(await readFileAsync(config, 'utf8'))), nodeModulePath.dirname(config))
    optionMap = { ...jsonOptionMap, ...optionMap }
  }

  __DEV__ && console.log('[option]')
  __DEV__ && Object.keys(optionMap).forEach((name) => console.log(`  - [${name}] ${JSON.stringify(getOption(name))}`))
  optionMap = processOptionMap(optionMap)

  try {
    switch (getSingleOption('mode')) {
      case 'env-info':
        const { isNode, isBrowser, environmentName, systemEndianness } = Dr.Env
        return console.log(JSON.stringify({ isNode, isBrowser, environmentName, systemEndianness }, null, '  '))
      case 'file-list':
        return console.log(JSON.stringify(await getFileList(getSingleOption('argument'))))
      case 'file-modify-copy':
        return modify.copy(...getOption('argument', 2))
      case 'file-modify-move':
        return modify.move(...getOption('argument', 2))
      case 'file-modify-delete':
        for (const path of getOption('argument')) await modify.delete(path).then(() => console.log(`[DELETE-DONE] ${path}`), (error) => console.warn(`[DELETE-ERROR] ${error}`))
        return
      case 'server-serve-static':
        let [ staticRoot, hostname = '0.0.0.0', port = 80 ] = getOptionOptional('argument')
        staticRoot = nodeModulePath.resolve(optionMap[ 'argument' ].source === 'JSON' ? nodeModulePath.dirname(config) : process.cwd(), staticRoot)
        return createServerServeStatic({ staticRoot, protocol: 'http:', hostname, port })
    }
  } catch (error) { console.warn(`[Error] in mode: ${getSingleOption('mode')}:\n`, error) }
}

const optionMapResolvePath = (optionMap, pathRelative) => {
  Object.values(optionMap).forEach(({ format: { isPath }, argumentList }) => isPath && argumentList.forEach((v, i) => (argumentList[ i ] = nodeModulePath.resolve(pathRelative, v))))
  return optionMap
}

main().catch(exitWithError)