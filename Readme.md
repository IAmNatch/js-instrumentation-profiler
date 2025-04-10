# Codemod for Adding Instrumentation Based Profiling to a Javascript File.

It works by adding timings to all function calls and method calls.

## Usage

### Installation

```bash
npm install js-instrumentation-profiler
```

### Basic Usage

To transform a JavaScript file with instrumentation profiling:

```bash
npx jscodeshift -t node_modules/js-instrumentation-profiler/js-instrumentation-profiler.js your-file.js
```

> **Note:** Currently, this codemod only works with single file libraries. Multi-file projects are not supported.

### Options

The codemod accepts the following options:

- `isPerformanceTest` (boolean): When set to `true`, adds a `getPerformanceResults()` function that returns timing data for all functions and automatically calls it at the end of the file.

Example with performance testing enabled:

```bash
npx jscodeshift -t node_modules/js-instrumentation-profiler/js-instrumentation-profiler.js --isPerformanceTest=true your-file.js
```

### What Gets Instrumented

The codemod automatically instruments:

1. Function declarations
2. Arrow functions
3. Nested function calls
4. Functions with return statements
5. Functions with conditional returns

### Output

The transformed code will include:

1. A `timingsMap` to store timing data for each function
2. Performance timing measurements at the start and end of each function
3. Call counting for each function
4. Proper handling of nested function calls
5. Accurate timing even with return statements

### Performance Results

When `isPerformanceTest` is enabled, you can access the timing data through the `getPerformanceResults()` function, which returns an object with:

- `totalDuration`: Total time spent in the function (in milliseconds)
- `calls`: Number of times the function was called

Example output:

```javascript
{
  "functionName": {
    totalDuration: 123.45,
    calls: 5
  }
}
```

## How it works

This codemod automatically instruments JavaScript code by adding performance timing measurements to all function declarations. It works by:

1. Detecting all function declarations in the source code
2. Creating a `timingsMap` to store timing data for each function
3. Adding instrumentation code at the beginning and end of each function
4. Handling nested function calls by tracking their timing separately
5. Properly handling return statements to ensure timing data is captured correctly

### Simple Example

```javascript
function Foo() {
  console.log("Foo is running");
}

Foo();
```

Will become:

```javascript
const timingsMap = new Map();
timingsMap.set("Foo", { totalDuration: 0, calls: 0 });

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
```

### Example with Nested Functions

- Because bar is a nested func that is part of the same library, it has its own timingsand therefor its processing time is not included in the total duration of Foo.
- We record everything that happens before the function call and track it in the localDuration variable.
- Once that function is done, we resume tracking the time it takes to run the remaining code in the function.
- At the end, we still add the localDuration to the total duration of Foo.
- It's important to note that we only do this for other functions that are part of the library.
  - If the function call is not part of the library, we include the entire duration of the function call in the total duration of Foo.
- To achieve this, we know every function that is part of the library in advance, during the codemod run.

```javascript
function Bar() {
  console.log("Bar is running");
}

function Foo() {
  console.log("Foo is running");
  Bar();
}

Foo();
```

Will become:

```javascript
const timingsMap = new Map();
timingsMap.set("Bar", { totalDuration: 0, calls: 0 });
timingsMap.set("Foo", { totalDuration: 0, calls: 0 });

function Bar() {
  /* --instrumentation-- */
  timingsMap.get("Bar").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  console.log("Bar is running");

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("Bar").totalDuration += localDuration;
  /* --end-instrumentation-- */
}

function Foo() {
  /* --instrumentation-- */
  timingsMap.get("Foo").calls += 1;
  let startTime = performance.now();
  let localDuration = 0;
  /* --end-instrumentation-- */

  console.log("Foo is running");

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  /* --end-instrumentation-- */

  Bar();

  /* --instrumentation-- */
  startTime = performance.now();
  /* --end-instrumentation-- */

  /* --instrumentation-- */
  localDuration += performance.now() - startTime;
  timingsMap.get("Foo").totalDuration += localDuration;
  /* --end-instrumentation-- */
}

Foo();
```

### Performance Testing Mode

When the codemod is run with the `isPerformanceTest` option set to `true`, it will:

1. Add a `getPerformanceResults()` function that returns an object with timing data for all functions
2. Automatically call this function at the end of the file to display the results

This allows for easy testing of the instrumentation's accuracy.

## Contributing

- Write Unit Tests and always run them. You can run tests with `npm run test`

## Testing Approach

The project uses a comprehensive testing strategy to ensure the codemod works correctly:

### Test Structure

- Tests are written using Vitest
- Tests are organized in a hierarchical structure with `describe` and `it` blocks
- Each test focuses on a specific aspect of the transformation

### Test Types

1. **Unit Tests**: Test individual components of the transformation

   - Function name detection
   - TimingsMap initialization
   - Timing instrumentation at function start/end
   - Return statement handling

2. **Integration Tests**: Test complete transformations

   - Simple function transformation
   - Functions with return statements
   - Conditional return statements
   - Nested function handling

3. **Performance Tests**: Test the actual timing functionality
   - Verify that timing measurements are accurate

### Fixtures Approach

To make tests more maintainable and readable, we use a fixtures-based approach:

1. **Fixture Files**: Test cases are stored in separate files in the `__fixtures__/static/` directory

   - Input files: `*.js` (e.g., `simple-function.js`)
   - Expected output files: `*.expected.js` (e.g., `simple-function.expected.js`)
   - Dynamic fixtures: Files with placeholders that can be replaced at runtime

2. **Benefits**:

   - Cleaner test code without large string literals
   - Easier to maintain and update test cases
   - Better readability for complex test cases
   - Separation of test logic from test data

3. **Usage in Tests**:

   ```typescript
   const source = readFixture("simple-function.js");
   const expected = readFixture("simple-function.expected.js");

   const result = transform({ source });
   expect(result).toEqual(expected);
   ```

4. **Dynamic Fixtures**:

   For tests that need to inject dynamic code (like performance testing), we use comment-based placeholders:
   Test cases are stored in separate files in the `__fixtures__/dynamic/` directory

   ```javascript
   // Example dynamic fixture file
   function Foo() {
     // @INJECT: SLEEP_FUNCTION_FOO
   }

   Foo();
   ```

   These placeholders are replaced at runtime using the `readDynamicFixture` function:

   ```typescript
   const source = readDynamicFixture(
     "simple-function.js",
     {
       SLEEP_FUNCTION_FOO: sleepSyncCode(10),
     },
     __filename
   );
   ```

   This approach avoids linting errors while still allowing for dynamic code injection.

5. **Maintenance**:
   - Fixture files should be kept clean (no trailing whitespace)
   - When adding new test cases, create corresponding fixture files
   - Use the `sed` command to clean whitespace if needed:
     ```bash
     find js-instrumentation-profiler/__fixtures__ -type f -name "*.js" -exec sed -i '' 's/[[:space:]]*$//' {} \;
     ```

## Implementation Todo List

### Phase 1: Basic Setup and Function Detection ✓

- [x] Set up initial test infrastructure
  - [x] Create test cases for simple function transformation
  - [x] Verify test runner is working
  - [x] Add granular test cases for individual features
  - [x] Add test case for preserving original function content
- [x] Implement function declaration detection
  - [x] Add test for detecting top-level function declarations
  - [x] Implement function name extraction
  - [x] Verify function detection works
- [x] Create timingsMap initialization
  - [x] Add test for timingsMap creation
  - [x] Implement code generation for timingsMap
  - [x] Verify timingsMap initialization works

### Phase 2: Basic Function Instrumentation ✓

- [x] Implement basic function instrumentation
  - [x] Add test for simple function transformation
  - [x] Add performance.now() timing code
  - [x] Add call counter increment
  - [x] Add duration calculation and storage
  - [x] Add instrumentation comments for clarity
  - [x] Verify basic instrumentation works
- [x] Handle function return statements
  - [x] Add test for functions with return statements
  - [x] Ensure timing code works with returns
  - [x] Verify return handling works

### Phase 3: Nested Function Handling ✓

- [x] Implement nested function detection
  - [x] Add test for nested function scenarios
  - [x] Create function scope tracking
  - [x] Verify nested function detection works
- [x] Add nested function instrumentation
  - [x] Add test for nested function timing
  - [x] Implement separate timing for nested functions
  - [x] Verify nested function timing works
- [x] Handle function calls within functions
  - [x] Add test for internal function calls
  - [x] Implement call tracking for internal functions
  - [x] Verify internal call tracking works

### Phase 4: Method Call Instrumentation ✓

- [x] Add method call detection
  - [x] Add test for method calls
  - [x] Implement method name extraction
  - [x] Verify method detection works
- [x] Implement method call instrumentation
  - [x] Add test for method call timing
  - [x] Add timing code for method calls
  - [x] Verify method timing works

### Phase 5: Edge Cases and Refinement

- [x] Handle arrow functions
  - [x] Add test for arrow function transformation
  - [x] Implement arrow function timing
  - [x] Verify arrow function handling works
- [ ] Handle class methods
  - [ ] Add test for class method transformation
  - [ ] Implement class method timing
  - [ ] Verify class method handling works

### Phase 6: Testing and Validation

- [x] Create comprehensive test suite for basic functionality
  - [x] Add tests for function name detection
  - [x] Add tests for timingsMap initialization
  - [x] Add tests for timing instrumentation
  - [x] Add tests for complex nested scenarios
  - [ ] Add tests for edge cases
- [x] Performance testing
  - [ ] Test with large codebases

### Phase 7: Documentation and Examples

- [ ] Update usage documentation
  - [ ] Add installation instructions
  - [ ] Add usage examples
  - [ ] Add configuration options
- [ ] Create example projects
  - [x] Add simple example (in README)
  - [ ] Add complex example
  - [ ] Add real-world example

### Validation Steps (After Each Phase)

1. Run test suite: `npm test`
2. Verify all tests pass
3. Check for any linting errors
4. Verify code formatting
5. Document any issues or edge cases found
6. Update implementation plan if needed
