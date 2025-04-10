const timingsMap = new Map();

timingsMap.set("add", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("divide", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("multiply", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("reset", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("subtract", {
  totalDuration: 0,
  calls: 0
});

class Calculator {
  constructor() {
    this.value = 0;
  }

  add(x) {

    /* --instrumentation-- */
    timingsMap.get("add").calls += 1;
    let startTime = performance.now();
    let localDuration = 0;
    /* --end-instrumentation-- */

    this.value += x;

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("add").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return this.value;
  }

  subtract(x) {

    /* --instrumentation-- */
    timingsMap.get("subtract").calls += 1;
    let startTime = performance.now();
    let localDuration = 0;
    /* --end-instrumentation-- */

    this.value -= x;

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("subtract").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return this.value;
  }

  multiply(x) {

    /* --instrumentation-- */
    timingsMap.get("multiply").calls += 1;
    let startTime = performance.now();
    let localDuration = 0;
    /* --end-instrumentation-- */

    this.value *= x;

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("multiply").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return this.value;
  }

  divide(x) {

    /* --instrumentation-- */
    timingsMap.get("divide").calls += 1;
    let startTime = performance.now();
    let localDuration = 0;
    /* --end-instrumentation-- */

    this.value /= x;

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("divide").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return this.value;
  }

  reset() {

    /* --instrumentation-- */
    timingsMap.get("reset").calls += 1;
    let startTime = performance.now();
    let localDuration = 0;
    /* --end-instrumentation-- */

    this.value = 0;

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("reset").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return this.value;
  }
}

const calc = new Calculator();
calc.add(5);
calc.multiply(2);
calc.subtract(3);
calc.divide(2);
calc.reset();