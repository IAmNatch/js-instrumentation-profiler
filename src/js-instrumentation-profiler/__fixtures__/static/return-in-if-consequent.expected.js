const timingsMap = new Map();

timingsMap.set("testFunction", {
  totalDuration: 0,
  calls: 0
});

function testFunction() {

  /* --instrumentation-- */
  timingsMap.get("testFunction").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  if (condition) {

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("testFunction").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return true;
  }

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("testFunction").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return false;
}

testFunction();