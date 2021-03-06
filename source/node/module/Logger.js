import { join as joinPath } from 'path'
import { getRandomId } from 'source/common/math/random'
import { createLogQueue } from 'source/node/data/LogQueue'
import { createDirectory } from 'source/node/file/File'
import { createSafeWriteStream } from './SafeWrite'

const createSimpleLogger = ({ pathOutputFile, queueLengthThreshold, flag, mode, onError }) => createLogQueue({
  outputStream: createSafeWriteStream({ pathOutputFile, flag, mode, onError }),
  queueLengthThreshold
})

const FILE_SPLIT_INTERVAL = 24 * 60 * 60 * 1000 // 24hour
const DEFAULT_GET_LOG_FILE_NAME = () => `${getRandomId()}.log`

const createLogger = async ({
  pathLogDirectory,
  getLogFileName = DEFAULT_GET_LOG_FILE_NAME,
  queueLengthThreshold,
  fileSplitInterval = FILE_SPLIT_INTERVAL,
  flag,
  mode,
  onError
}) => {
  await createDirectory(pathLogDirectory)

  let logger = null
  const splitLogFile = () => {
    logger && logger.end()
    logger = createSimpleLogger({ pathOutputFile: joinPath(pathLogDirectory, getLogFileName()), queueLengthThreshold, flag, mode, onError })
  }

  splitLogFile()
  let intervalToken = setInterval(splitLogFile, fileSplitInterval)

  return {
    add: (...args) => logger && logger.add(args.join(' ')),
    save: () => logger && logger.save(),
    split: splitLogFile,
    end: () => {
      intervalToken && clearInterval(intervalToken) && (intervalToken = null)
      logger && logger.end() && (logger = null)
    }
  }
}

export { createLogger, createSimpleLogger }
