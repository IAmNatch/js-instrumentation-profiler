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

  let num = 1 + 5;
  console.log("Foo");
  let num2 = num * 2;

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("Foo").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return num2;
}