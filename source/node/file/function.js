import { resolve, normalize, dirname, sep } from 'path'
import {
  stat, lstat, access, rename, unlink,
  readFile, writeFile, copyFile,
  mkdir, rmdir, readdir,
  createReadStream, createWriteStream,
  constants as fsConstants,
  open, fstat
} from 'fs'
import { promisify } from 'util'

const statAsync = promisify(stat)
const lstatAsync = promisify(lstat)
const renameAsync = promisify(rename)
const unlinkAsync = promisify(unlink)
const accessAsync = promisify(access)
const visibleAsync = (path) => new Promise((resolve) => access(path, fsConstants.F_OK, (error) => resolve(!error)))
const readableAsync = (path) => new Promise((resolve) => access(path, fsConstants.R_OK, (error) => resolve(!error)))
const writableAsync = (path) => new Promise((resolve) => access(path, fsConstants.W_OK, (error) => resolve(!error)))
const executableAsync = (path) => new Promise((resolve) => access(path, fsConstants.X_OK, (error) => resolve(!error)))

const mkdirAsync = promisify(mkdir)
const rmdirAsync = promisify(rmdir)
const readdirAsync = promisify(readdir)

const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const copyFileAsync = copyFile
  ? promisify(copyFile) // since 8.5.0
  : (() => {
    const openAsync = promisify(open)
    const fstatAsync = promisify(fstat)
    return async (pathFrom, pathTo) => {
      const fdFrom = await openAsync(pathFrom, 'r')
      const stat = await fstatAsync(fdFrom)
      const fdTo = await openAsync(pathTo, 'w', stat.mode)
      const readStream = createReadStream(undefined, { fd: fdFrom })
      const writeStream = createWriteStream(undefined, { fd: fdTo, mode: stat.mode })
      await new Promise((resolve, reject) => {
        readStream.on('error', reject)
        writeStream.on('error', reject)
        writeStream.on('close', resolve)
        readStream.pipe(writeStream)
      })
    }
  })()

const nearestExistAsync = async (path) => {
  while (path && !await visibleAsync(path)) path = dirname(path)
  return path
}

const createPathPrefixLock = (rootPath) => {
  rootPath = resolve(rootPath)
  return (relativePath) => {
    const absolutePath = resolve(rootPath, relativePath)
    if (!absolutePath.startsWith(rootPath)) throw new Error(`[PathPrefixLock] invalid relativePath: ${relativePath}`)
    return absolutePath
  }
}

const trimPathDepth = (path, depth) => normalize(path).split(sep).slice(0, depth).join(sep)
const toPosixPath = sep === '\\'
  ? (path) => path.replace(/\\/g, '/')
  : (path) => path

export {
  statAsync,
  lstatAsync,
  renameAsync,
  unlinkAsync,
  accessAsync,
  visibleAsync,
  readableAsync,
  writableAsync,
  executableAsync,
  mkdirAsync,
  rmdirAsync,
  readdirAsync,
  readFileAsync,
  writeFileAsync,
  copyFileAsync,
  nearestExistAsync,

  createReadStream,
  createWriteStream,
  createPathPrefixLock,

  toPosixPath,
  trimPathDepth
}
