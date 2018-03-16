const _ = require('lodash')
const bunyan = require('bunyan')
const Promise = require('bluebird')

const logger = bunyan.createLogger({ name: 'onebyone' })

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
    tap = _.identity,
    shouldSkip = false,
    shouldNext = true,
    until = false,
    exit = false,
    exitOnError = false,
    concurrency = 1,
    delay = 0,
  } = step

  let requestArgsResult
  let requestResult
  let parseResult
  let dataResults

  const currentStepKey = `${stepHistory}${stepHistory && '.'}${stepKey}`

  try {
    requestArgsResult = await invoke(
      requestArgs,
      lastDataResult,
      allStepRecords
    )
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
    dataResults = await invoke(data, parseResult, allStepRecords)
  } catch (err) {
    logger.error(err, `${currentStepKey}.data`)
    exitOnError && process.exit()
    return
  }
  logData && logger.info({ logData: dataResults }, `${currentStepKey}.logData`)

  try {
    !_.isEmpty(dataResults) && (await tap(dataResults, allStepRecords))
  } catch (err) {
    logger.error(err, `${currentStepKey}.tap`)
    exitOnError && process.exit()
    return
  }
  exit && process.exit()

  delay && (await Promise.delay(delay * 1000))

  await Promise.map(
    _.compact(_.castArray(dataResults)),
    async (dataResult, i) => {
      const nextStepKey = `${stepHistory}${stepHistory && '.'}${stepKey}[${i}]`
      try {
        try {
          if (await invoke(shouldSkip, dataResult, allStepRecords)) {
            return
          }
        } catch (err) {
          logger.error(err, `${nextStepKey}.shouldSkip`)
          exitOnError && process.exit()
          return
        }

        try {
          if (!await invoke(shouldNext, dataResult, allStepRecords)) {
            return
          }
        } catch (err) {
          logger.error(err, `${nextStepKey}.shouldNext`)
          exitOnError && process.exit()
          return
        }

        await module.exports(restSteps, nextStepKey, dataResult, {
          ...allStepRecords,
          [stepKey]: dataResult,
        })
      } catch (err) {
        logger.error(err, 'onebyone internal error')
        exitOnError && process.exit()
      }
    },
    {
      concurrency,
    }
  )

  const untilSteps = await invoke(until, parseResult, allStepRecords)
  if (untilSteps) {
    return module.exports(
      { ...steps, [stepKey]: { ...steps[stepKey], ...untilSteps } },
      stepHistory,
      lastDataResult,
      allStepRecords
    )
  }
}
