const timingsMap = new Map();

timingsMap.set("regularFunction", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("method1", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("method2", {
  totalDuration: 0,
  calls: 0
});

const obj = {};

obj.method1 = function() {

  /* --instrumentation-- */
  timingsMap.get("method1").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  console.log("Method 1");

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("method1").totalDuration += localDuration;
  /* --end-instrumentation-- */

};

obj.method2 = function() {

  /* --instrumentation-- */
  timingsMap.get("method2").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  console.log("Method 2");
  obj.method1();

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("method2").totalDuration += localDuration;
  /* --end-instrumentation-- */

};

// Function declaration for comparison
function regularFunction() {

  /* --instrumentation-- */
  timingsMap.get("regularFunction").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  console.log("Regular function");
  obj.method2();

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("regularFunction").totalDuration += localDuration;
  /* --end-instrumentation-- */

}

regularFunction();