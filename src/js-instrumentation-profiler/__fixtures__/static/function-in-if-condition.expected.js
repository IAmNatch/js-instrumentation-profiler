const timingsMap = new Map();

timingsMap.set("innerFunction", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("outerFunction", {
  totalDuration: 0,
  calls: 0
});

function innerFunction(x) {

  /* --instrumentation-- */
  timingsMap.get("innerFunction").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */


  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("innerFunction").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return x > 0;
}

function outerFunction(x) {

  /* --instrumentation-- */
  timingsMap.get("outerFunction").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */


  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  /* --end-instrumentation-- */

  const outerFunction_innerFunction_result = innerFunction(x);

  /* --instrumentation-- */
  startTime = performance.now();
  /* --end-instrumentation-- */

  if (outerFunction_innerFunction_result) {

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("outerFunction").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return true;
  }

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("outerFunction").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return false;
}

outerFunction(5);