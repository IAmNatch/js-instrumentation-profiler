export const sleepSyncCode = (ms: number) => `(() => {
    const startTime = performance.now();
    while (performance.now() - startTime < ${ms}) {
      // do nothing
    }
  })()`