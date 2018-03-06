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
    shouldSkip: any = async () => false,
    shouldNext: any = async () => true,
    exit = false,
    exitOnError = false,
    delay = 0,
    restart = 0,
  }
}
```