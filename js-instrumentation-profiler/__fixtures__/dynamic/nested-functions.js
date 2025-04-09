function outer() {
  // @INJECT: SLEEP_FUNCTION_OUTER
  function inner() {
    // @INJECT: SLEEP_FUNCTION_INNER
  }
  inner();
}
outer(); 