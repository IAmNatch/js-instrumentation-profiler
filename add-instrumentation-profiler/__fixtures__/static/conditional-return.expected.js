const timingsMap = new Map();

timingsMap.set("processNumber", {
  totalDuration: 0,
  calls: 0
});

function processNumber(num) {

  /* --instrumentation-- */
  timingsMap.get("processNumber").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  if (num < 0) {
    console.log("negative");

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("processNumber").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return -1;
  } else if (num === 0) {

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("processNumber").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return 0;
  }

  const result = num * 2;

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("processNumber").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return result;
}