## API

```js
type Steps = {
  [key]: {
    requestArgs: any = async (lastStepDataResult, allStepRecords) => {},
    request = async (requestArgsResult, allStepRecords) => {},
    logRequest = false,
    parse = async (requestResult, allStepRecords) => {}
    logParse = false,
    data: any = async (parseResult, allStepRecords) => {},
    logData = false,
    tap = async (dataResult, allStepRecords) => {},
    shouldSkip: any = async (singleDataResult, allStepRecords) => false,
    shouldNext: any = async (singleDataResult, allStepRecords) => true,
    until: any = async (parseResult, allStepRecords) => false,
    exit = false,
    exitOnError = false,
    concurrency = 1,
    delay = 0,
  }
}
```