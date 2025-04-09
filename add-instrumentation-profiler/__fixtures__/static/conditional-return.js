function processNumber(num) {
  if (num < 0) {
    console.log("negative");
    return -1;
  } else if (num === 0) {
    return 0;
  }

  const result = num * 2;
  return result;
}