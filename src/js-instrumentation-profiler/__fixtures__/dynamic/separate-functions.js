function secondFunction() {
   // @INJECT: SLEEP_FUNCTION_SECOND
   let firstCalculation = 1 + 2;
}

function firstFunction() {
   // @INJECT: SLEEP_FUNCTION_FIRST_BEFORE
   let firstCalculation = 1 + 2;
   const callSecond = secondFunction();
   // @INJECT: SLEEP_FUNCTION_FIRST_AFTER
   let secondCalculation = firstCalculation + 1;
}

firstFunction();