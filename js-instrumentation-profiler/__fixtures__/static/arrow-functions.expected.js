const timingsMap = new Map();

timingsMap.set("Foo", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("Bar", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("Baz", {
  totalDuration: 0,
  calls: 0
});

const Foo = () => {

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

};

const Bar = (x) => {

  /* --instrumentation-- */
  timingsMap.get("Bar").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  console.log("Bar is running with", x);

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("Bar").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return x * 2;
};

const Baz = (x, y) => {

  /* --instrumentation-- */
  timingsMap.get("Baz").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  const result = x + y;

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("Baz").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return result;
};

Foo();
Bar(5);
Baz(3, 4);