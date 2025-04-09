const Foo = () => {
  console.log("Foo is running");
};

const Bar = (x) => {
  console.log("Bar is running with", x);
  return x * 2;
};

const Baz = (x, y) => x + y;

Foo();
Bar(5);
Baz(3, 4); 