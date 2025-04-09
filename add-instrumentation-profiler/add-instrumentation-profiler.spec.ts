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
  timingsMap.get("Foo").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  console.log("Foo is running");
  localDuration = performance.now() - startTime;
  timingsMap.get("Foo").totalDuration += localDuration;
}

Foo();`;
    expect(transform({source})).toEqual(expected);
  });
});