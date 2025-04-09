const Foo = () => {
  // @INJECT: SLEEP_FUNCTION_FOO
  console.log("Foo is running");
};

const Bar = (x) => {
  // @INJECT: SLEEP_FUNCTION_BAR
  console.log("Bar is running with", x);
  return x * 2;
};

Foo();
Bar(5); 