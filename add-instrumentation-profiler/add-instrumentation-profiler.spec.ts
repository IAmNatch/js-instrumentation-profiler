import { describe, it, expect } from 'vitest';
import { createTestTransform } from '../test-utils/create-test-transform';
import transformer from './add-instrumentation-profiler';

describe("add-instrumentation-profiler", () => {
  const transform = createTestTransform(transformer);

  describe("transformation", () => {
    it('should find all function names in the source code', () => {
      const source = `
function Foo() {}
function Bar() {}
function Baz() {}
`;
      const result = transform({source});
      
      // Check that all function names are found by verifying timingsMap.set calls
      expect(result).toContain('timingsMap.set("Foo"');
      expect(result).toContain('timingsMap.set("Bar"');
      expect(result).toContain('timingsMap.set("Baz"');
    });

    it('should create timingsMap entries with correct initial values', () => {
      const source = `
function Foo() {}
function Bar() {}
`;
      const result = transform({source});
      
      // Verify the timingsMap initialization structure
      expect(result).toContain('const timingsMap = new Map()');
      expect(result).toContain('timingsMap.set("Foo", {\n  totalDuration: 0,\n  calls: 0\n})');
      expect(result).toContain('timingsMap.set("Bar", {\n  totalDuration: 0,\n  calls: 0\n})');
    });

    it('should add correct timing instrumentation at start of function', () => {
      const source = `
function Foo() {
  console.log("test");
}
`;
      const result = transform({source});
      
      // Verify the timing setup code is added at the start
      expect(result).toContain('timingsMap.get("Foo").calls += 1');
      expect(result).toContain('let startTime = performance.now()');
      expect(result).toContain('let localDuration = 0');
    });

    it('should add correct timing instrumentation at end of function', () => {
      const source = `
function Foo() {
  console.log("test");
}
`;
      const result = transform({source});
      
      // Verify the timing calculation and storage code is added at the end
      expect(result).toContain('localDuration += performance.now() - startTime');
      expect(result).toContain('timingsMap.get("Foo").totalDuration += localDuration');
    });

    it('should preserve the original function body content', () => {
      const source = `
function Foo() {
  const x = 1;
  console.log("test");
  return x + 2;
}
`;
      const result = transform({source});
      
      // Verify the original function content is preserved
      expect(result).toContain('const x = 1');
      expect(result).toContain('console.log("test")');
      expect(result).toContain('return x + 2');
    });

    it('should transform a simple function with timing instrumentation', () => {
      const source = `
function Foo() {
  console.log("Foo is running");
}

Foo();
`;
      const expected = `const timingsMap = new Map();

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

Foo();`;
      
      const result = transform({source});
      expect(result).toEqual(expected);
    });

    it('should include handle return statements', () => {
      const source = `
function Foo() {
  let num = 1 + 5;
  console.log("Foo");
  let num2 = num * 2;
  return num2;
}
`;
      const result = transform({source});
      
      // Define the expected result
      const expectedResult = `const timingsMap = new Map();

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
}`;
      
      // Compare the result with the expected result
      expect(result).toEqual(expectedResult);
    });

    it('should handle conditional return statements', () => {
      const source = `
function processNumber(num) {
  if (num < 0) {
    console.log("negative");
    return -1;
  } else if (num === 0) {
    return 0;
  }
  
  const result = num * 2;
  return result;
}
`;
      const result = transform({source});
      
      // Define the expected result
      const expectedResult = `const timingsMap = new Map();

timingsMap.set("processNumber", {
  totalDuration: 0,
  calls: 0
});

function processNumber(num) {

  /* --instrumentation-- */
  timingsMap.get("processNumber").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  if (num < 0) {
    console.log("negative");

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("processNumber").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return -1;
  } else if (num === 0) {

    /* --instrumentation-- */
    localDuration += performance.now() - startTime;
    timingsMap.get("processNumber").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return 0;
  }

  const result = num * 2;

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("processNumber").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return result;
}`;
      
      // Compare the result with the expected result
      expect(result).toEqual(expectedResult);
    });

    it('should detect nested functions and add them to timingsMap', () => {
      const source = `
function outer() {
  function inner() {
    console.log("Inner function");
  }
  
  inner();
  console.log("Outer function");
}
`;
      const result = transform({source});
      
      // Check that both outer and inner functions are added to timingsMap
      expect(result).toContain('timingsMap.set("outer"');
      expect(result).toContain('timingsMap.set("inner"');
      
      // Check that both functions have timing instrumentation
      expect(result).toContain('timingsMap.get("outer").calls += 1');
      expect(result).toContain('timingsMap.get("inner").calls += 1');
    });

    it('should transform nested functions with complete timing instrumentation', () => {
      const source = `
function outer() {
  function inner() {
    console.log("Inner function");
    return "inner result";
  }

  const calculateSomething = 1 + 2
  const calculateSomethingElse = 3 + 4
  const result = inner();
  const calculationSomethingOnceMore = 5 + 6
  console.log("Outer function");
  return result;
}
`;
      const result = transform({source});
      
      // Define the expected result
      const expectedResult = `const timingsMap = new Map();

timingsMap.set("outer", {
  totalDuration: 0,
  calls: 0
});

timingsMap.set("inner", {
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
}`;
      
      // Compare the result with the expected result
      expect(result).toEqual(expectedResult);
    });
  });

  describe("instrumentation quality", () => {
    it("should accurately instrument a single function", () => {
      const source = `
function Foo() {
   ${sleepSyncCode(100)}
   return 11;
}

Foo();
`;
      const codeToRun = transform({source});
      
      // evaluate result code using javascript eval
      const result = eval(codeToRun);
      console.log(result);
      expect(result).toEqual(11);
    })
  })
});

const sleepSyncCode = (ms: number) => `(() => {
  const startTime = performance.now();
  while (performance.now() - startTime < ${ms}) {
    // do nothing
  }
})()`

