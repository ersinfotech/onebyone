const _ = require('lodash')
const bunyan = require('bunyan')

const logger = bunyan.createLogger({ name: 'onebyone' }

const invoke = (any, ...args) => (_.isFunction(any) ? any(...args) : any)

module.exports = async (
  steps,
  stepHistory = '',
  lastDataResult,
  allStepRecords = {}
) => {
  const stepKeys = _.keys(steps)
  if (_.isEmpty(stepKeys)) {
    return
  }
  const stepKey = stepKeys[0]
  const restSteps = _.omit(steps, stepKey)

  const step = steps[stepKey]
  const {
    request = _.identity,
    requestArgs = _.identity,
    logRequest = false,
    parse = _.identity,
    logParse = false,
    data = _.identity,
    logData = false,
    shouldSkip = () => false,
    shouldNext = () => true,
    exit = false,
    exitOnError = false,
    delay = 0,
    restart = 0,
  } = step

  let requestArgsResult
  let requestResult
  let parseResult
  let dataResults

  const currentStepKey = `${stepHistory}${stepHistory && '.'}${stepKey}`

  try {
    requestArgsResult = await invoke(requestArgs, lastDataResult)
  } catch (err) {
    logger.error(err, `${currentStepKey}.requestArgs`)
    exitOnError && process.exit()
    return
  }
  try {
    requestResult = await request(requestArgsResult)
  } catch (err) {
    logger.error(err, `${currentStepKey}.request`)
    exitOnError && process.exit()
    return
  }
  logRequest &&
    logger.info({ logRequest: requestResult }, `${currentStepKey}.logRequest`)
  try {
    parseResult = await parse(requestResult)
  } catch (err) {
    logger.error(err, `${currentStepKey}.parse`)
    exitOnError && process.exit()
    return
  }
  logParse &&
    logger.info({ logParse: parseResult }, `${currentStepKey}.logParse`)
  try {
    dataResults = _.compact(
      _.castArray(await invoke(data, parseResult, allStepRecords))
    )
  } catch (err) {
    logger.error(err, `${currentStepKey}.data`)
    exitOnError && process.exit()
    return
  }
  logData && logger.info({ logData: dataResults }, `${currentStepKey}.logData`)
  exit && process.exit()
  for (const [i, dataResult] of dataResults.entries()) {
    const nextStepKey = `${stepHistory}${stepHistory && '.'}${stepKey}[${i}]`
    try {
      try {
        if (await invoke(shouldSkip, dataResult)) {
          continue
        }
      } catch (err) {
        logger.error(err, `${nextStepKey}.shouldSkip`)
        exitOnError && process.exit()
        continue
      }
      try {
        if (!await invoke(shouldNext, dataResult)) {
          continue
        }
      } catch (err) {
        logger.error(err, `${nextStepKey}.shouldNext`)
        exitOnError && process.exit()
        continue
      }
      delay && (await Promise.delay(delay * 1000))
      await module.exports(restSteps, nextStepKey, dataResult, {
        ...allStepRecords,
        [stepKey]: dataResult,
      })
    } catch (err) {
      logger.error(err, 'parser internal error')
      exitOnError && process.exit()
    }
  }
  if (restart) {
    logger.info(`wait ${restart}s to restart`)
    await Promise.delay(restart * 1000)
    return module.exports(steps, stepHistory, lastDataResult, allStepRecords)
  }
}
