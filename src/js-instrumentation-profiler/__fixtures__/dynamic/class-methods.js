class Calculator {
  constructor() {
    this.value = 0;
  }

  add(x) {
    // @INJECT: SLEEP_FUNCTION_ADD
    this.value += x;
    return this.value;
  }

  subtract(x) {
    // @INJECT: SLEEP_FUNCTION_SUBTRACT
    this.value -= x;
    return this.value;
  }

  multiply(x) {
    // @INJECT: SLEEP_FUNCTION_MULTIPLY
    this.value *= x;
    return this.value;
  }

  divide(x) {
    // @INJECT: SLEEP_FUNCTION_DIVIDE
    this.value /= x;
    return this.value;
  }

  reset() {
    // @INJECT: SLEEP_FUNCTION_RESET
    this.value = 0;
    return this.value;
  }
}

const calc = new Calculator();
calc.add(5);
calc.multiply(2);
calc.subtract(3);
calc.divide(2);
calc.reset(); 