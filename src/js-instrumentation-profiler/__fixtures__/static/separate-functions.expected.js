const timingsMap = new Map();

timingsMap.set("firstFunction", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("secondFunction", {
  totalDuration: 0,
  calls: 0
});

function secondFunction() {

  /* --instrumentation-- */
  timingsMap.get("secondFunction").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  let firstCalculation = 1 + 2;

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("secondFunction").totalDuration += localDuration;
  /* --end-instrumentation-- */

}

function firstFunction() {

  /* --instrumentation-- */
  timingsMap.get("firstFunction").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  let firstCalculation = 1 + 2;

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  /* --end-instrumentation-- */

  const callSecond = secondFunction();

  /* --instrumentation-- */
  startTime = performance.now();
  /* --end-instrumentation-- */

  let secondCalculation = firstCalculation + 1;

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("firstFunction").totalDuration += localDuration;
  /* --end-instrumentation-- */

}