function testFunction() {
  if (Math.random() > 0.5) {
    console.log("Random number is greater than 0.5");
  }
  
  if (innerFunction(5)) {
    console.log("innerFunction returned true");
  }
}

function innerFunction(x) {
  return x > 0;
}

testFunction(); 