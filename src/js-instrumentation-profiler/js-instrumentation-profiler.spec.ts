import { describe, it, expect } from "vitest";
import { createTestTransform } from "../test-utils/create-test-transform";
import transformer from "./js-instrumentation-profiler";
import { sleepSyncCode } from "../test-utils/injectable-code-strings";
import { readFixture, readDynamicFixture } from "../test-utils/fixture-utils";
import { fileURLToPath } from "url";
import { expectDurationWithVariance } from "../test-utils/expect-utils";

const __filename = fileURLToPath(import.meta.url);

describe("js-instrumentation-profiler", () => {
  const transform = createTestTransform(transformer);

  describe("transformation", () => {
    it("should find all function names in the source code", () => {
      const source = `
function Foo() {}
function Bar() {}
function Baz() {}
`;
      const result = transform({ source });

      // Check that all function names are found by verifying timingsMap.set calls
      expect(result).toContain('timingsMap.set("Foo"');
      expect(result).toContain('timingsMap.set("Bar"');
      expect(result).toContain('timingsMap.set("Baz"');
    });

    it("should create timingsMap entries with correct initial values", () => {
      const source = `
function Foo() {}
function Bar() {}
`;
      const result = transform({ source });

      // Verify the timingsMap initialization structure
      expect(result).toContain("const timingsMap = new Map()");
      expect(result).toContain(
        'timingsMap.set("Foo", {\n  totalDuration: 0,\n  calls: 0\n})'
      );
      expect(result).toContain(
        'timingsMap.set("Bar", {\n  totalDuration: 0,\n  calls: 0\n})'
      );
    });

    it("should add correct timing instrumentation at start of function", () => {
      const source = `
function Foo() {
  console.log("test");
}
`;
      const result = transform({ source });

      // Verify the timing setup code is added at the start
      expect(result).toContain('timingsMap.get("Foo").calls += 1');
      expect(result).toContain("let startTime = performance.now()");
      expect(result).toContain("let localDuration = 0");
    });

    it("should add correct timing instrumentation at start of arrow function", () => {
      const source = `
const Foo = () => {
  console.log("test");
}
`;
      const result = transform({ source });

      // Verify the timing setup code is added at the start
      expect(result).toContain('timingsMap.get("Foo").calls += 1');
      expect(result).toContain("let startTime = performance.now()");
      expect(result).toContain("let localDuration = 0");
    });

    it("should add correct timing instrumentation at end of function", () => {
      const source = `
function Foo() {
  console.log("test");
}
`;
      const result = transform({ source });

      // Verify the timing calculation and storage code is added at the end
      expect(result).toContain(
        "localDuration += performance.now() - startTime"
      );
      expect(result).toContain(
        'timingsMap.get("Foo").totalDuration += localDuration'
      );
    });

    it("should add correct timing instrumentation at end of arrow function", () => {
      const source = `
const Foo = () => {
  console.log("test");
}
`;
      const result = transform({ source });

      // Verify the timing calculation and storage code is added at the end
      expect(result).toContain(
        "localDuration += performance.now() - startTime"
      );
      expect(result).toContain(
        'timingsMap.get("Foo").totalDuration += localDuration'
      );
    });

    it("should preserve the original function body content", () => {
      const source = `
function Foo() {
  const x = 1;
  console.log("test");
  return x + 2;
}
`;
      const result = transform({ source });

      // Verify the original function content is preserved
      expect(result).toContain("const x = 1");
      expect(result).toContain('console.log("test")');
      expect(result).toContain("return x + 2");
    });

    it("should preserve the original arrow function body content", () => {
      const source = `
const Foo = () => {
  const x = 1;
  console.log("test");
  return x + 2;
}
`;
      const result = transform({ source });

      // Verify the original function content is preserved
      expect(result).toContain("const x = 1");
      expect(result).toContain('console.log("test")');
      expect(result).toContain("return x + 2");
    });

    it("should transform a simple function with timing instrumentation", () => {
      const source = readFixture("simple-function.js", __filename);
      const expected = readFixture("simple-function.expected.js", __filename);

      const result = transform({ source });
      expect(result).toEqual(expected);
    });

    it("should transform arrow functions with timing instrumentation", () => {
      const source = readFixture("arrow-functions.js", __filename);
      const expected = readFixture("arrow-functions.expected.js", __filename);

      const result = transform({ source });
      expect(result).toEqual(expected);
    });

    it("should include handle return statements", () => {
      const source = readFixture("return-statement.js", __filename);
      const expected = readFixture("return-statement.expected.js", __filename);

      const result = transform({ source });
      expect(result).toEqual(expected);
    });

    it("should handle conditional return statements", () => {
      const source = readFixture("conditional-return.js", __filename);
      const expected = readFixture(
        "conditional-return.expected.js",
        __filename
      );

      const result = transform({ source });
      expect(result).toEqual(expected);
    });

    it("should handle return statements directly inside if statement consequents", () => {
      const source = readFixture("return-in-if-consequent.js", __filename);
      const expected = readFixture(
        "return-in-if-consequent.expected.js",
        __filename
      );
      const result = transform({ source });

      expect(result).toEqual(expected);
    });

    it("should detect nested functions and add them to timingsMap", () => {
      const source = readFixture("nested-functions.js", __filename);
      const result = transform({ source });

      // Check that both outer and inner functions are added to timingsMap
      expect(result).toContain('timingsMap.set("outer"');
      expect(result).toContain('timingsMap.set("inner"');

      // Check that both functions have timing instrumentation
      expect(result).toContain('timingsMap.get("outer").calls += 1');
      expect(result).toContain('timingsMap.get("inner").calls += 1');
    });

    it("should transform nested functions with complete timing instrumentation", () => {
      const source = readFixture("nested-functions.js", __filename);
      const expected = readFixture("nested-functions.expected.js", __filename);
      const result = transform({ source });

      expect(result).toEqual(expected);
    });

    it("should add performance test specific code when isPerformanceTest is true", () => {
      const source = readFixture("simple-function.js", __filename);
      const result = transform({ source }, { isPerformanceTest: true });

      // Check that the getPerformanceResults function is added
      expect(result).toContain("function getPerformanceResults()");

      // Check that the getPerformanceResults function is called at the end
      expect(result).toContain("getPerformanceResults()");

      // Check that the function returns an object with the function names as keys
      expect(result).toContain('{\n    Foo: timingsMap.get("Foo")\n  }');
      // Ensure getPerformanceResults() is the last line in the transformed code
      const lastLine = result
        .split("\n")
        .filter((line) => line.trim())
        .pop();
      expect(lastLine).toBe("getPerformanceResults();");
    });

    it("should transform separate functions with one calling the other", () => {
      const source = readFixture("separate-functions.js", __filename);
      const expected = readFixture(
        "separate-functions.expected.js",
        __filename
      );
      const result = transform({ source });

      expect(result).toEqual(expected);
    });

    it("should transform object methods with timing instrumentation", () => {
      const source = readFixture("object-method.js", __filename);
      const expected = readFixture("object-method.expected.js", __filename);
      const result = transform({ source });

      expect(result).toEqual(expected);
    });

    it("should properly instrument function calls inside if statement conditions", () => {
      const source = readFixture("function-in-if-condition.js", __filename);
      const expected = readFixture(
        "function-in-if-condition.expected.js",
        __filename
      );
      const result = transform({ source });

      expect(result).toEqual(expected);
    });

    it("should not extract non-library function calls in if statement conditions", () => {
      const source = readFixture("non-library-function-in-if.js", __filename);
      const expected = readFixture(
        "non-library-function-in-if.expected.js",
        __filename
      );
      const result = transform({ source });

      expect(result).toEqual(expected);
    });

    it("should handle mixed library and non-library functions in the same if statement", () => {
      const source = readFixture("mixed-functions-in-if.js", __filename);
      const expected = readFixture(
        "mixed-functions-in-if.expected.js",
        __filename
      );
      const result = transform({ source });

      expect(result).toEqual(expected);
    });

    it("should handle if statements without blocks", () => {
      const source = `
function innerFunction(x) {
  return x > 0;
}

function outerFunction(x) {
  if (innerFunction(x)) return true;
  return false;
}

outerFunction(5);
`;
      const result = transform({ source });
      expect(result).toContain(
        "const outerFunction_innerFunction_result = innerFunction(x)"
      );
      expect(result).toContain("if (outerFunction_innerFunction_result)");
    });

    it("should handle return statements with function calls without blocks", () => {
      const source = `
function getValue() {
  return 42;
}

function checkValue() {
  if (condition) return getValue();
  return false;
}
`;
      const result = transform({ source });
      // Check that the function call is extracted before the return
      expect(result).toContain("const checkValue_getValue_result = getValue()");
      // Check that the return uses the extracted value
      expect(result).toContain("return checkValue_getValue_result");
      // Check that timing code is added before the return
      expect(result).toContain(
        "localDuration += performance.now() - startTime"
      );
      expect(result).toContain(
        'timingsMap.get("checkValue").totalDuration += localDuration'
      );
    });

    it("should transform class methods with timing instrumentation", () => {
      const source = readFixture("class-methods.js", __filename);
      const expected = readFixture("class-methods.expected.js", __filename);
      const result = transform({ source });

      expect(result).toEqual(expected);
    });
  });

  describe("instrumentation quality", () => {
    it("should accurately instrument a single function", () => {
      const SIMPLE_SLEEP_DURATION = 10; // 10ms
      const source = readDynamicFixture(
        "simple-function.js",
        {
          SLEEP_FUNCTION_FOO: sleepSyncCode(SIMPLE_SLEEP_DURATION),
        },
        __filename
      );
      const codeToRun = transform({ source }, { isPerformanceTest: true });

      // evaluate result code using javascript eval
      const result = eval(codeToRun);
      expectDurationWithVariance(
        result.Foo.totalDuration,
        SIMPLE_SLEEP_DURATION
      );
      expect(result.Foo.calls).toBe(1);
    });

    it("should accurately instrument arrow functions", () => {
      const ARROW_FOO_SLEEP_DURATION = 10; // 10ms
      const ARROW_BAR_SLEEP_DURATION = 20; // 20ms
      const source = readDynamicFixture(
        "arrow-functions.js",
        {
          SLEEP_FUNCTION_FOO: sleepSyncCode(ARROW_FOO_SLEEP_DURATION),
          SLEEP_FUNCTION_BAR: sleepSyncCode(ARROW_BAR_SLEEP_DURATION),
        },
        __filename
      );
      const codeToRun = transform({ source }, { isPerformanceTest: true });

      // evaluate result code using javascript eval
      const result = eval(codeToRun);
      expectDurationWithVariance(
        result.Foo.totalDuration,
        ARROW_FOO_SLEEP_DURATION
      );
      expect(result.Foo.calls).toBe(1);
      expectDurationWithVariance(
        result.Bar.totalDuration,
        ARROW_BAR_SLEEP_DURATION
      );
      expect(result.Bar.calls).toBe(1);
    });

    it("should accurately instrument nested functions", () => {
      const NESTED_OUTER_SLEEP_DURATION = 10; // 10ms
      const NESTED_INNER_SLEEP_DURATION = 10; // 10ms
      const source = readDynamicFixture(
        "nested-functions.js",
        {
          SLEEP_FUNCTION_OUTER: sleepSyncCode(NESTED_OUTER_SLEEP_DURATION),
          SLEEP_FUNCTION_INNER: sleepSyncCode(NESTED_INNER_SLEEP_DURATION),
        },
        __filename
      );
      const codeToRun = transform({ source }, { isPerformanceTest: true });

      // evaluate result code using javascript eval
      const result = eval(codeToRun);

      // Check outer function timing
      expectDurationWithVariance(
        result.outer.totalDuration,
        NESTED_OUTER_SLEEP_DURATION
      );
      expect(result.outer.calls).toBe(1);

      // Check inner function timing
      expectDurationWithVariance(
        result.inner.totalDuration,
        NESTED_INNER_SLEEP_DURATION
      );
      expect(result.inner.calls).toBe(1);
    });

    it("should correctly time separate functions with one calling the other", () => {
      const FIRST_FUNCTION_BEFORE_SLEEP = 10; // 10ms
      const SECOND_FUNCTION_SLEEP = 20; // 20ms
      const FIRST_FUNCTION_AFTER_SLEEP = 10; // 10ms

      const source = readDynamicFixture(
        "separate-functions.js",
        {
          SLEEP_FUNCTION_FIRST_BEFORE: sleepSyncCode(
            FIRST_FUNCTION_BEFORE_SLEEP
          ),
          SLEEP_FUNCTION_SECOND: sleepSyncCode(SECOND_FUNCTION_SLEEP),
          SLEEP_FUNCTION_FIRST_AFTER: sleepSyncCode(FIRST_FUNCTION_AFTER_SLEEP),
        },
        __filename
      );

      const codeToRun = transform({ source }, { isPerformanceTest: true });

      // evaluate result code using javascript eval
      const result = eval(codeToRun);

      // Check firstFunction timing (should be sum of before and after sleep, not including secondFunction)
      expectDurationWithVariance(
        result.firstFunction.totalDuration,
        FIRST_FUNCTION_BEFORE_SLEEP + FIRST_FUNCTION_AFTER_SLEEP
      );
      expect(result.firstFunction.calls).toBe(1);

      // Check secondFunction timing
      expectDurationWithVariance(
        result.secondFunction.totalDuration,
        SECOND_FUNCTION_SLEEP
      );
      expect(result.secondFunction.calls).toBe(1);
    });

    it("should correctly time functions called inside if statement conditions", () => {
      const INNER_FUNCTION_SLEEP = 20; // 20ms
      const OUTER_FUNCTION_BEFORE_SLEEP = 10; // 10ms
      const OUTER_FUNCTION_AFTER_SLEEP = 10; // 10ms

      const source = readDynamicFixture(
        "function-in-if-condition.js",
        {
          SLEEP_FUNCTION_INNER: sleepSyncCode(INNER_FUNCTION_SLEEP),
          SLEEP_FUNCTION_OUTER_BEFORE: sleepSyncCode(
            OUTER_FUNCTION_BEFORE_SLEEP
          ),
          SLEEP_FUNCTION_OUTER_AFTER: sleepSyncCode(OUTER_FUNCTION_AFTER_SLEEP),
        },
        __filename
      );

      const codeToRun = transform({ source }, { isPerformanceTest: true });

      // evaluate result code using javascript eval
      const result = eval(codeToRun);

      // Check innerFunction timing
      expectDurationWithVariance(
        result.innerFunction.totalDuration,
        INNER_FUNCTION_SLEEP
      );
      expect(result.innerFunction.calls).toBe(1);

      // Check outerFunction timing (should be sum of before and after sleep, not including innerFunction)
      expectDurationWithVariance(
        result.outerFunction.totalDuration,
        OUTER_FUNCTION_BEFORE_SLEEP + OUTER_FUNCTION_AFTER_SLEEP
      );
      expect(result.outerFunction.calls).toBe(1);
    });

    it("should accurately instrument class methods", () => {
      const ADD_SLEEP_DURATION = 10; // 10ms
      const MULTIPLY_SLEEP_DURATION = 15; // 15ms
      const SUBTRACT_SLEEP_DURATION = 20; // 20ms
      const DIVIDE_SLEEP_DURATION = 25; // 25ms
      const RESET_SLEEP_DURATION = 5; // 5ms

      const source = readDynamicFixture(
        "class-methods.js",
        {
          SLEEP_FUNCTION_ADD: sleepSyncCode(ADD_SLEEP_DURATION),
          SLEEP_FUNCTION_MULTIPLY: sleepSyncCode(MULTIPLY_SLEEP_DURATION),
          SLEEP_FUNCTION_SUBTRACT: sleepSyncCode(SUBTRACT_SLEEP_DURATION),
          SLEEP_FUNCTION_DIVIDE: sleepSyncCode(DIVIDE_SLEEP_DURATION),
          SLEEP_FUNCTION_RESET: sleepSyncCode(RESET_SLEEP_DURATION),
        },
        __filename
      );

      const codeToRun = transform({ source }, { isPerformanceTest: true });

      // evaluate result code using javascript eval
      const result = eval(codeToRun);

      // Check each method's timing
      expectDurationWithVariance(result.add.totalDuration, ADD_SLEEP_DURATION);
      expect(result.add.calls).toBe(1);

      expectDurationWithVariance(
        result.multiply.totalDuration,
        MULTIPLY_SLEEP_DURATION
      );
      expect(result.multiply.calls).toBe(1);

      expectDurationWithVariance(
        result.subtract.totalDuration,
        SUBTRACT_SLEEP_DURATION
      );
      expect(result.subtract.calls).toBe(1);

      expectDurationWithVariance(
        result.divide.totalDuration,
        DIVIDE_SLEEP_DURATION
      );
      expect(result.divide.calls).toBe(1);

      expectDurationWithVariance(
        result.reset.totalDuration,
        RESET_SLEEP_DURATION
      );
      expect(result.reset.calls).toBe(1);
    });
  });
});
