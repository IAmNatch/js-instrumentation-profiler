function innerFunction(x) {
  // @INJECT: SLEEP_FUNCTION_INNER
  return x > 0;
}

function outerFunction(x) {
  // @INJECT: SLEEP_FUNCTION_OUTER_BEFORE
  if (innerFunction(x)) {
    // @INJECT: SLEEP_FUNCTION_OUTER_AFTER
    return true;
  }
  return false;
}

outerFunction(5); 