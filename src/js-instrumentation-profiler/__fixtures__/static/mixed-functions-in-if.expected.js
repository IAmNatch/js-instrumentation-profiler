const timingsMap = new Map();

timingsMap.set("innerFunction", {
  totalDuration: 0,
  calls: 0
});

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


  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  /* --end-instrumentation-- */

  const testFunction_innerFunction_result = innerFunction(5);

  /* --instrumentation-- */
  startTime = performance.now();
  /* --end-instrumentation-- */

  if (Math.random() > 0.5 && testFunction_innerFunction_result) {
    console.log("Random number is greater than 0.5 and innerFunction returned true");
  }


  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  /* --end-instrumentation-- */

  const testFunction_innerFunction_result2 = innerFunction(10);

  /* --instrumentation-- */
  startTime = performance.now();
  /* --end-instrumentation-- */


  if (testFunction_innerFunction_result2 && Math.random() < 0.3) {
    console.log("innerFunction returned true and random number is less than 0.3");
  }

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("testFunction").totalDuration += localDuration;
  /* --end-instrumentation-- */

}

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

testFunction();