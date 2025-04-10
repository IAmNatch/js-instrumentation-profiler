const obj = {};

obj.method1 = function() {
  console.log("Method 1");
};

obj.method2 = function() {
  console.log("Method 2");
  obj.method1();
};

// Function declaration for comparison
function regularFunction() {
  console.log("Regular function");
  obj.method2();
}

regularFunction(); 