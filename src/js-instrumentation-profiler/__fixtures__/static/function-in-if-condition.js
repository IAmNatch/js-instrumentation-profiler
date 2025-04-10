function innerFunction(x) {
  return x > 0;
}

function outerFunction(x) {
  if (innerFunction(x)) {
    return true;
  }
  return false;
}

outerFunction(5);