## API

```js
type Steps = {
  [key]: {
    requestArgs: any = async (lastStepDataResult, allStepRecords) => {},
    request = async (requestArgsResult) => {},
    logRequest = false,
    parse = async (requestResult) => {}
    logParse = false,
    data: any = async (parseResult, allStepRecords) => {},
    logData = false,
    tap = async (dataResult, allStepRecords) => {},
    shouldSkip: any = async () => false,
    shouldNext: any = async () => true,
    until: any = async (parseResult, allStepRecords) => false,
    exit = false,
    exitOnError = false,
    concurrency = 1,
    delay = 0,
  }
}
```