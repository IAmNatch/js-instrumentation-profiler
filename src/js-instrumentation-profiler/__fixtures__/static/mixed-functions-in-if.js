function testFunction() {
  if (Math.random() > 0.5 && innerFunction(5)) {
    console.log("Random number is greater than 0.5 and innerFunction returned true");
  }
  
  if (innerFunction(10) && Math.random() < 0.3) {
    console.log("innerFunction returned true and random number is less than 0.3");
  }
}

function innerFunction(x) {
  return x > 0;
}

testFunction(); 