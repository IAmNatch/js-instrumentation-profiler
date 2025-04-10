const timingsMap = new Map();

timingsMap.set("inner", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("outer", {
  totalDuration: 0,
  calls: 0
});

function outer() {

  /* --instrumentation-- */
  timingsMap.get("outer").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  function inner() {

    /* --instrumentation-- */
    timingsMap.get("inner").calls += 1;
    let startTime = performance.now();
    let localDuration = 0;
    /* --end-instrumentation-- */

    console.log("Inner function");

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("inner").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return "inner result";
  }

  const calculateSomething = 1 + 2
  const calculateSomethingElse = 3 + 4

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  /* --end-instrumentation-- */

  const result = inner();

  /* --instrumentation-- */
  startTime = performance.now();
  /* --end-instrumentation-- */

  const calculationSomethingOnceMore = 5 + 6
  console.log("Outer function");

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("outer").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return result;
}