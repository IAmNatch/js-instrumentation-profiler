function outer() {
  function inner() {
    console.log("Inner function");
    return "inner result";
  }

  const calculateSomething = 1 + 2
  const calculateSomethingElse = 3 + 4
  const result = inner();
  const calculationSomethingOnceMore = 5 + 6
  console.log("Outer function");
  return result;
}