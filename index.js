const _ = require('lodash')
const bunyan = require('bunyan')
const Promise = require('bluebird')

const logger = bunyan.createLogger({
  name: 'onebyone',
  serializers: bunyan.stdSerializers,
})

const invoke = (any, ...args) => (_.isFunction(any) ? any(...args) : any)
module.exports = async (
  steps,
  { path = '', stepHistory = '', lastDataResult, allStepRecords = {} } = {}
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
    logCtx = true,
  } = step

  let requestArgsResult
  let requestResult
  let parseResult
  let dataResults

  const currentStepKey = `${stepHistory}${stepHistory && '.'}${stepKey}`
  const pwd = path && ` in ${path}`

  try {
    requestArgsResult = await invoke(
      requestArgs,
      lastDataResult,
      allStepRecords
    )
  } catch (err) {
    logger.error(
      { err, ctx: logCtx && allStepRecords },
      `${currentStepKey}.requestArgs${pwd}`
    )
    exitOnError && process.exit()
    return
  }

  try {
    requestResult = await request(requestArgsResult, allStepRecords)
  } catch (err) {
    logger.error(
      { err, ctx: logCtx && allStepRecords },
      `${currentStepKey}.request${pwd}`
    )
    exitOnError && process.exit()
    return
  }
  logRequest &&
    logger.info(
      { logRequest: requestResult },
      `${currentStepKey}.logRequest${pwd}`
    )

  try {
    parseResult = await parse(requestResult, allStepRecords)
  } catch (err) {
    logger.error(
      { err, ctx: logCtx && allStepRecords },
      `${currentStepKey}.parse${pwd}`
    )
    exitOnError && process.exit()
    return
  }
  logParse &&
    logger.info({ logParse: parseResult }, `${currentStepKey}.logParse${pwd}`)

  try {
    dataResults = await invoke(data, parseResult, allStepRecords)
  } catch (err) {
    logger.error(
      { err, ctx: logCtx && allStepRecords },
      `${currentStepKey}.data${pwd}`
    )
    exitOnError && process.exit()
    return
  }
  logData &&
    logger.info({ logData: dataResults }, `${currentStepKey}.logData${pwd}`)

  try {
    !_.isEmpty(dataResults) && (await tap(dataResults, allStepRecords))
  } catch (err) {
    logger.error(
      { err, ctx: logCtx && allStepRecords },
      `${currentStepKey}.tap${pwd}`
    )
    exitOnError && process.exit()
    return
  }
  exit && process.exit()

  delay &&
    (await Promise.delay(
      (await invoke(delay, lastDataResult, allStepRecords)) * 1000
    ))

  const concurrencyResult = await invoke(
    concurrency,
    lastDataResult,
    allStepRecords
  )

  await Promise[concurrencyResult === 1 ? 'mapSeries' : 'map'](
    _.compact(_.castArray(dataResults)),
    async (dataResult, i) => {
      const nextStepKey = `${stepHistory}${stepHistory && '.'}${stepKey}[${i}]`
      try {
        try {
          if (await invoke(shouldSkip, dataResult, allStepRecords)) {
            return
          }
        } catch (err) {
          logger.error(
            { err, ctx: logCtx && allStepRecords },
            `${nextStepKey}.shouldSkip${pwd}`
          )
          exitOnError && process.exit()
          return
        }

        try {
          if (!(await invoke(shouldNext, dataResult, allStepRecords))) {
            return
          }
        } catch (err) {
          logger.error(
            { err, ctx: logCtx && allStepRecords },
            `${nextStepKey}.shouldNext${pwd}`
          )
          exitOnError && process.exit()
          return
        }

        await module.exports(restSteps, {
          path,
          stepHistory: nextStepKey,
          lastDataResult: dataResult,
          allStepRecords: {
            ...allStepRecords,
            [stepKey]: dataResult,
          },
        })
      } catch (err) {
        logger.error(
          { err, ctx: logCtx && allStepRecords },
          `onebyone internal error${pwd}`
        )
        exitOnError && process.exit()
      }
    },
    {
      concurrency: concurrencyResult,
    }
  )

  let untilSteps
  try {
    untilSteps = await invoke(until, parseResult, allStepRecords)
  } catch (err) {
    logger.error(
      { err, ctx: logCtx && allStepRecords },
      `${currentStepKey}.until${pwd}`
    )
    exitOnError && process.exit()
    return
  }
  if (untilSteps) {
    return module.exports(
      { ...steps, [stepKey]: { ...steps[stepKey], ...untilSteps } },
      {
        path,
        stepHistory,
        lastDataResult,
        allStepRecords,
      }
    )
  }
}
