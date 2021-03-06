import { spawn, spawnSync } from 'child_process'
import { catchAsync } from 'source/common/error'
import { receiveBufferAsync } from 'source/node/data/Buffer'

const getExitError = (error, exitData) => Object.assign(
  error || new Error(`non-zero exit code: ${exitData.code}, signal: ${exitData.signal}`),
  exitData
)

const run = ({ command, argList = [], option }) => {
  const subProcess = spawn(command, argList, { stdio: 'inherit', shell: true, ...option })
  const promise = new Promise((resolve, reject) => {
    subProcess.on('error', (error) => reject(getExitError(error, { command, argList, code: 1, signal: 'process error' }))) // default error code
    subProcess.on('exit', (code, signal) => code !== 0
      ? reject(getExitError(null, { command, argList, code, signal }))
      : resolve({ command, argList, code, signal }))
  })
  return { subProcess, promise }
}

const runSync = ({ command, argList = [], option }) => {
  const { status: code, signal, error } = spawnSync(command, argList, { stdio: 'inherit', shell: true, ...option })
  if (error || code) throw getExitError(error, { command, argList, code, signal })
  return { command, argList, code, signal }
}

const runQuiet = ({ command, argList, option }) => {
  option = { stdio: [ 'ignore', 'pipe', 'pipe' ], ...option }
  const { subProcess: { stdout, stderr }, promise } = run({ command, argList, option })
  const stdoutBufferPromise = receiveBufferAsync(stdout)
  const stderrBufferPromise = receiveBufferAsync(stderr)
  return promise.then(
    (result) => Object.assign(result, { stdoutBufferPromise, stderrBufferPromise }),
    (error) => { throw Object.assign(error, { stdoutBufferPromise, stderrBufferPromise }) }
  )
}

const withCwd = (pathCwd, taskAsync) => async (...args) => {
  const prevCwd = process.cwd()
  process.chdir(pathCwd)
  const { result, error } = await catchAsync(taskAsync, ...args)
  process.chdir(prevCwd)
  if (error) throw error
  return result
}

export {
  run,
  runSync,
  runQuiet,
  withCwd
}
