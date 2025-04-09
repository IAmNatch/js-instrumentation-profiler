import { describe, it, expect } from 'vitest';
import { createTestTransform } from '../test-utils/create-test-transform';
import transformer from './add-instrumentation-profiler';

describe("add-instrumentation-profiler", () => {
  const transform = createTestTransform(transformer);

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
    expect(result).toContain('localDuration = performance.now() - startTime');
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
  localDuration = performance.now() - startTime;
  timingsMap.get("Foo").totalDuration += localDuration;
  /* --end-instrumentation-- */

}

Foo();`;
    
    const result = transform({source});
    console.log(result);
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
  localDuration = performance.now() - startTime;
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
    localDuration = performance.now() - startTime;
    timingsMap.get("processNumber").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return -1;
  } else if (num === 0) {

    /* --instrumentation-- */
    localDuration = performance.now() - startTime;
    timingsMap.get("processNumber").totalDuration += localDuration;
    /* --end-instrumentation-- */

    return 0;
  }

  const result = num * 2;

  /* --instrumentation-- */
  localDuration = performance.now() - startTime;
  timingsMap.get("processNumber").totalDuration += localDuration;
  /* --end-instrumentation-- */

  return result;
}`;
    
    // Compare the result with the expected result
    expect(result).toEqual(expectedResult);
  });
});

