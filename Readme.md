# Codemod for Adding Instrumentation Based Profiling to a Javascript File.

It works by adding timings to all function calls and method calls.

## Usage

```
Coming Soon!
```

## How it works

It works by adding timings to all function calls and method calls.

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
  localDuration = performance.now() - startTime;
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
  timingsMap.get("Bar").calls++;
  let startTime = performance.now();
  let localDuration = 0;

  console.log("Bar is running");

  localDuration = performance.now() - startTime;
  timingsMap.get("Bar").totalDuration += localDuration;
}

function Foo() {
  timingsMap.get("Foo").calls++;
  let startTime = performance.now();
  let localDuration = 0;

  console.log("Foo is running");

  localDuration = performance.now() - startTime;
  Bar();
  startTime = performance.now();
  localDuration += performance.now() - startTime;

  timingsMap.get("Foo").totalDuration += localDuration;
}

Foo();
```

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

1. **Fixture Files**: Test cases are stored in separate files in the `__fixtures__` directory

   - Input files: `*.js` (e.g., `simple-function.js`)
   - Expected output files: `*.expected.js` (e.g., `simple-function.expected.js`)

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

4. **Maintenance**:
   - Fixture files should be kept clean (no trailing whitespace)
   - When adding new test cases, create corresponding fixture files
   - Use the `sed` command to clean whitespace if needed:
     ```bash
     find add-instrumentation-profiler/__fixtures__ -type f -name "*.js" -exec sed -i '' 's/[[:space:]]*$//' {} \;
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

### Phase 3: Nested Function Handling

- [x] Implement nested function detection
  - [x] Add test for nested function scenarios
  - [x] Create function scope tracking
  - [x] Verify nested function detection works
- [x] Add nested function instrumentation
  - [x] Add test for nested function timing
  - [x] Implement separate timing for nested functions
  - [ ] Verify nested function timing works
- [ ] Handle function calls within functions
  - [ ] Add test for internal function calls
  - [ ] Implement call tracking for internal functions
  - [ ] Verify internal call tracking works

### Phase 4: Method Call Instrumentation

- [ ] Add method call detection
  - [ ] Add test for method calls
  - [ ] Implement method name extraction
  - [ ] Verify method detection works
- [ ] Implement method call instrumentation
  - [ ] Add test for method call timing
  - [ ] Add timing code for method calls
  - [ ] Verify method timing works

### Phase 5: Edge Cases and Refinement

- [ ] Handle arrow functions
  - [ ] Add test for arrow function transformation
  - [ ] Implement arrow function timing
  - [ ] Verify arrow function handling works
- [ ] Handle class methods
  - [ ] Add test for class method transformation
  - [ ] Implement class method timing
  - [ ] Verify class method handling works

### Phase 6: Testing and Validation

- [x] Create comprehensive test suite for basic functionality
  - [x] Add tests for function name detection
  - [x] Add tests for timingsMap initialization
  - [x] Add tests for timing instrumentation
  - [ ] Add tests for complex nested scenarios
  - [ ] Add tests for edge cases
- [ ] Performance testing
  - [ ] Test with large codebases
  - [ ] Verify minimal performance impact
  - [ ] Document performance characteristics

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
