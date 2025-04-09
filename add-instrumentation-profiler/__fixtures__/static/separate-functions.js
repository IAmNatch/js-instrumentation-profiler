function secondFunction() {
  let firstCalculation = 1 + 2;
}

function firstFunction() {
  let firstCalculation = 1 + 2;
  const callSecond = secondFunction();
  let secondCalculation = firstCalculation + 1;
}