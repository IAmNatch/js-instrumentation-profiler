import { describe, it, expect } from 'vitest';
import { createTestTransform } from '../test-utils/create-test-transform';
import transformer from './add-instrumentation-profiler';
import { sleepSyncCode } from '../test-utils/injectable-code-strings';
import { readFixture, readDynamicFixture } from '../test-utils/fixture-utils';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

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
      const source = readFixture('simple-function.js', __filename);
      const expected = readFixture('simple-function.expected.js', __filename);
      
      const result = transform({source});
      expect(result).toEqual(expected);
    });

    it('should include handle return statements', () => {
      const source = readFixture('return-statement.js', __filename);
      const expected = readFixture('return-statement.expected.js', __filename);
      
      const result = transform({source});
      expect(result).toEqual(expected);
    });

    it('should handle conditional return statements', () => {
      const source = readFixture('conditional-return.js', __filename);
      const expected = readFixture('conditional-return.expected.js', __filename);
      
      const result = transform({source});
      expect(result).toEqual(expected);
    });

    it('should detect nested functions and add them to timingsMap', () => {
      const source = readFixture('nested-functions.js', __filename);
      const result = transform({source});
      
      // Check that both outer and inner functions are added to timingsMap
      expect(result).toContain('timingsMap.set("outer"');
      expect(result).toContain('timingsMap.set("inner"');
      
      // Check that both functions have timing instrumentation
      expect(result).toContain('timingsMap.get("outer").calls += 1');
      expect(result).toContain('timingsMap.get("inner").calls += 1');
    });

    it('should transform nested functions with complete timing instrumentation', () => {
      const source = readFixture('nested-functions.js', __filename);
      const expected = readFixture('nested-functions.expected.js', __filename);
      
      const result = transform({source});
      expect(result).toEqual(expected);
    });

    it("should add performance test specific code when isPerformanceTest is true", () => {
      const source = readFixture('simple-function.js', __filename);
      const result = transform({source}, true);
      
      // Check that the getPerformanceResults function is added
      expect(result).toContain('function getPerformanceResults()');
      
      // Check that the getPerformanceResults function is called at the end
      expect(result).toContain('getPerformanceResults()');
      
      // Check that the function returns an object with the function names as keys
      expect(result).toContain('{\n    Foo: timingsMap.get("Foo")\n  }');
      // Ensure getPerformanceResults() is the last line in the transformed code
      const lastLine = result.split('\n').filter(line => line.trim()).pop();
      expect(lastLine).toBe('getPerformanceResults();');
    });
  });

  describe("instrumentation quality", () => {
    it("should accurately instrument a single function", () => {
      const SIMPLE_SLEEP_DURATION = 10;
      const source = readDynamicFixture('simple-function.js', {
        SLEEP_FUNCTION_FOO: sleepSyncCode(SIMPLE_SLEEP_DURATION)
      }, __filename);
      const codeToRun = transform({source}, true);
      
      // evaluate result code using javascript eval
      const result = eval(codeToRun);
      expect(result.Foo.totalDuration).toBeCloseTo(SIMPLE_SLEEP_DURATION, 0);
      expect(result.Foo.calls).toBe(1);
    });

    it("should accurately instrument nested functions", () => {
      const NESTED_OUTER_SLEEP_DURATION = 5;
      const NESTED_INNER_SLEEP_DURATION = 3;
      const source = readDynamicFixture('nested-functions.js', {
        SLEEP_FUNCTION_OUTER: sleepSyncCode(NESTED_OUTER_SLEEP_DURATION),
        SLEEP_FUNCTION_INNER: sleepSyncCode(NESTED_INNER_SLEEP_DURATION)
      }, __filename);
      const codeToRun = transform({source}, true);
      
      // evaluate result code using javascript eval
      const result = eval(codeToRun);
      
      // Check outer function timing
      expect(result.outer.totalDuration).toBeCloseTo(NESTED_OUTER_SLEEP_DURATION, 0);
      expect(result.outer.calls).toBe(1);
      
      // Check inner function timing
      expect(result.inner.totalDuration).toBeCloseTo(NESTED_INNER_SLEEP_DURATION, 0);
      expect(result.inner.calls).toBe(1);
    });
  })
});



