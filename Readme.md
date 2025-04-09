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
  timingsMap.get("Foo").calls++;
  let startTime = performance.now();
  let localDuration = 0;

  console.log("Foo is running");

  localDuration = performance.now() - startTime;
  timingsMap.get("Foo").totalDuration += localDuration;
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

- Write Unit Tests and always run them.
