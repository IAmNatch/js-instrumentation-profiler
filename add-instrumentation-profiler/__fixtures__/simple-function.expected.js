const timingsMap = new Map();

timingsMap.set("Foo", {
  totalDuration: 0,
  calls: 0
});

function Foo() {

  /* --instrumentation-- */
  timingsMap.get("Foo").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  console.log("Foo is running");

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("Foo").totalDuration += localDuration;
  /* --end-instrumentation-- */

}

Foo();