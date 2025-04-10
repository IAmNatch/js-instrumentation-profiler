// Sample class with methods
class Calculator {
  constructor() {
    this.value = 0;
  }

  add(x) {
    this.value += x;
    return this.value;
  }

  subtract(x) {
    this.value -= x;
    return this.value;
  }
}

// Regular function
function multiply(a, b) {
  return a * b;
}

// Arrow function
const divide = (a, b) => a / b;

// Nested function
function complexOperation(x) {
  function inner(y) {
    return y * 2;
  }
  
  return inner(x) + multiply(x, 2);
}

// Function with conditional return
function checkValue(x) {
  if (x > 0) {
    return "positive";
  } else if (x < 0) {
    return "negative";
  }
  return "zero";
}

// Usage examples
const calc = new Calculator();
calc.add(5);
calc.subtract(2);

multiply(4, 3);
divide(10, 2);
complexOperation(5);
checkValue(42); 