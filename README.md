## API

```js
type Steps = {
  [key]: {
    requestArgs: any = async (lastStepDataResult) => {},
    request = async (requestArgsResult) => {},
    logRequest = false,
    parse = async (requestResult) => {}
    logParse = false,
    data: any = async (parseResult, allStepRecords) => {},
    logData = false,
    tap = async (dataResult) => {},
    shouldSkip: any = async () => false,
    shouldNext: any = async () => true,
    until: any = async (parseResult) => false,
    exit = false,
    exitOnError = false,
    concurrency = 1,
    delay = 0,
  }
}
```