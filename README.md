## API

```typescript
interface Step = {
  requestArgs: any = async (lastStepDataResult, allStepRecords) => lastStepDataResult,
  request = async (requestArgsResult, allStepRecords) => requestArgsResult,
  logRequest = false,
  parse = async (requestResult, allStepRecords) => requestResult,
  logParse = false,
  data: any = async (parseResult, allStepRecords) => parseResult,
  logData = false,
  tap = async (dataResult, allStepRecords) => {},
  shouldSkip: any = async (singleDataResult, allStepRecords) => false,
  shouldNext: any = async (singleDataResult, allStepRecords) => true,
  until: any|Step = async (parseResult, allStepRecords) => false,
  exit = false,
  exitOnError = false,
  concurrency = 1,
  delay = 0,
}

interface Steps = {
  [key]: Step
}

function onebyone(steps: Steps): void
```
