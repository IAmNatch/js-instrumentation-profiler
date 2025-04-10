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

  multiply(x) {
    this.value *= x;
    return this.value;
  }

  divide(x) {
    this.value /= x;
    return this.value;
  }

  reset() {
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