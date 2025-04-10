export const sleepSyncCode = (ms) => `(() => {
    const startTime = performance.now();
    while (performance.now() - startTime < ${ms}) {
      // do nothing
    }
  })()`;
