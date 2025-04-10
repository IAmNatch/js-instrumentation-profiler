import type {
  API,
  FileInfo,
  ASTPath,
  ASTNode,
  JSCodeshift,
  Node,
  CallExpression,
  LogicalExpression,
  BinaryExpression,
  Identifier,
} from "jscodeshift";

export default function transformer(
  file: FileInfo,
  api: API,
  options: { isPerformanceTest?: boolean } = {}
): string {
  const j = api.jscodeshift;
  const root = j(file.source);
  const isPerformanceTest = options.isPerformanceTest || false;

  // Find all function declarations and arrow functions
  const functionDeclarations = root.find(j.FunctionDeclaration);
  const arrowFunctions = root.find(j.VariableDeclaration).filter((path) => {
    // Check if this is a variable declaration with an arrow function
    return path.node.declarations.some(
      (declaration) =>
        j.VariableDeclarator.check(declaration) &&
        declaration.init &&
        j.ArrowFunctionExpression.check(declaration.init)
    );
  });

  // Find all object method assignments (e.g. obj.method = function() {})
  const objectMethodAssignments = root
    .find(j.AssignmentExpression)
    .filter((path) => {
      const node = path.node;
      return (
        j.MemberExpression.check(node.left) &&
        j.FunctionExpression.check(node.right)
      );
    });

  // Create a map to store function names
  const functionNames: string[] = [];

  // Helper function to extract function calls in if conditions
  function extractFunctionCallInIfCondition(
    path: ASTPath<ASTNode>,
    j: JSCodeshift
  ) {
    // Find all if statements
    const ifStatements = j(path.node).find(j.IfStatement);

    // Map to track function call counts within this function
    const functionCallCounts = new Map<string, number>();

    ifStatements.forEach((ifPath) => {
      const ifStatement = ifPath.value;
      const test = ifStatement.test;

      // Function to process a node and extract function calls
      const processNode = (
        node: CallExpression | LogicalExpression | BinaryExpression | Identifier
      ): CallExpression | LogicalExpression | BinaryExpression | Identifier => {
        // If it's a call expression with a library function
        if (j.CallExpression.check(node)) {
          const callee = node.callee;
          if (
            j.Identifier.check(callee) &&
            functionNames.includes(callee.name)
          ) {
            // Get the function name from the path
            let functionName = "anonymous";
            if (j.FunctionDeclaration.check(path.node) && path.node.id) {
              functionName = path.node.id.name as string;
            }

            // Get the count for this function call
            const count = functionCallCounts.get(callee.name) || 0;
            functionCallCounts.set(callee.name, count + 1);

            // Create a temporary variable for the function call result
            const tempVarName =
              count === 0
                ? `${functionName}_${callee.name}_result`
                : `${functionName}_${callee.name}_result${count + 1}`;
            const tempVar = j.variableDeclaration("const", [
              j.variableDeclarator(j.identifier(tempVarName), node),
            ]);

            // Insert the temporary variable declaration before the if statement
            // First, find the parent statement list
            let currentPath = ifPath;
            while (
              currentPath &&
              !Array.isArray(currentPath.parent.node.body)
            ) {
              currentPath = currentPath.parent;
            }

            if (
              currentPath &&
              currentPath.parent &&
              Array.isArray(currentPath.parent.node.body)
            ) {
              const parentBody = currentPath.parent.node.body;
              const statementIndex = parentBody.indexOf(currentPath.node);
              if (statementIndex !== -1) {
                parentBody.splice(statementIndex, 0, tempVar);
              }
            }

            // Return the identifier to replace the function call
            return j.identifier(tempVarName);
          }
        }

        // If it's a logical expression, process its left and right sides
        if (j.LogicalExpression.check(node)) {
          const left = processNode(
            node.left as
              | CallExpression
              | LogicalExpression
              | BinaryExpression
              | Identifier
          );
          const right = processNode(
            node.right as
              | CallExpression
              | LogicalExpression
              | BinaryExpression
              | Identifier
          );

          // Create a new logical expression with the processed sides
          return j.logicalExpression(node.operator, left, right);
        }

        // If it's a binary expression, process its left and right sides
        if (j.BinaryExpression.check(node)) {
          const left = processNode(
            node.left as
              | CallExpression
              | LogicalExpression
              | BinaryExpression
              | Identifier
          );
          const right = processNode(
            node.right as
              | CallExpression
              | LogicalExpression
              | BinaryExpression
              | Identifier
          );

          // Create a new binary expression with the processed sides
          return j.binaryExpression(node.operator, left, right);
        }

        // For other node types, return as is
        return node;
      };

      // Process the test expression
      ifStatement.test = processNode(
        test as
          | CallExpression
          | LogicalExpression
          | BinaryExpression
          | Identifier
      );
    });

    // Find all return statements and extract their expressions if they contain function calls
    const returnStatements = j(path.node).find(j.ReturnStatement);
    returnStatements.forEach((returnPath) => {
      const returnStatement = returnPath.value;
      if (
        returnStatement.argument &&
        j.CallExpression.check(returnStatement.argument)
      ) {
        const callee = returnStatement.argument.callee;
        if (j.Identifier.check(callee) && functionNames.includes(callee.name)) {
          // Get the function name from the path
          let functionName = "anonymous";
          if (j.FunctionDeclaration.check(path.node) && path.node.id) {
            functionName = path.node.id.name as string;
          }

          // Get the count for this function call
          const count = functionCallCounts.get(callee.name) || 0;
          functionCallCounts.set(callee.name, count + 1);

          // Create a temporary variable for the return expression
          const tempVarName =
            count === 0
              ? `${functionName}_${callee.name}_result`
              : `${functionName}_${callee.name}_result${count + 1}`;
          const tempVar = j.variableDeclaration("const", [
            j.variableDeclarator(
              j.identifier(tempVarName),
              returnStatement.argument
            ),
          ]);

          // Replace the expression with the temporary variable
          returnStatement.argument = j.identifier(tempVarName);

          // Insert the temporary variable declaration before the return statement
          // First, find the parent statement list
          let insertPath = returnPath;
          while (insertPath && !Array.isArray(insertPath.parent.node.body)) {
            insertPath = insertPath.parent;
          }

          if (
            insertPath &&
            insertPath.parent &&
            Array.isArray(insertPath.parent.node.body)
          ) {
            const parentBody = insertPath.parent.node.body;
            const statementIndex = parentBody.indexOf(insertPath.node);
            if (statementIndex !== -1) {
              parentBody.splice(statementIndex, 0, tempVar);
            }
          } else {
            // If we can't find a parent with a body array, try to wrap the statement in a block
            if (
              returnPath.parent &&
              j.IfStatement.check(returnPath.parent.node)
            ) {
              const ifStatement = returnPath.parent.node;
              const blockStatement = j.blockStatement([
                tempVar,
                returnPath.node,
              ]);
              if (ifStatement.consequent === returnPath.node) {
                ifStatement.consequent = blockStatement;
              } else if (ifStatement.alternate === returnPath.node) {
                ifStatement.alternate = blockStatement;
              }
            }
          }
        }
      }
    });
  }

  // Collect all function names from function declarations
  functionDeclarations.forEach((path) => {
    if (path.node.id) {
      functionNames.push(path.node.id.name as string);
    }
  });

  // Collect all function names from arrow functions
  arrowFunctions.forEach((path) => {
    path.node.declarations.forEach((declaration) => {
      if (
        j.VariableDeclarator.check(declaration) &&
        j.Identifier.check(declaration.id)
      ) {
        functionNames.push(declaration.id.name as string);
      }
    });
  });

  // Collect all function names from object method assignments
  objectMethodAssignments.forEach((path) => {
    const node = path.node;
    if (
      j.MemberExpression.check(node.left) &&
      j.Identifier.check(node.left.property)
    ) {
      functionNames.push(node.left.property.name as string);
    }
  });

  // Create the timingsMap initialization
  const timingsMapInit = j.variableDeclaration("const", [
    j.variableDeclarator(
      j.identifier("timingsMap"),
      j.newExpression(j.identifier("Map"), [])
    ),
  ]);

  // Add entries to the timingsMap for each function
  const timingsMapEntries = functionNames.map((name) =>
    j.expressionStatement(
      j.callExpression(
        j.memberExpression(j.identifier("timingsMap"), j.identifier("set")),
        [
          j.stringLiteral(name),
          j.objectExpression([
            j.objectProperty(
              j.identifier("totalDuration"),
              j.numericLiteral(0)
            ),
            j.objectProperty(j.identifier("calls"), j.numericLiteral(0)),
          ]),
        ]
      )
    )
  );

  // Transform each function declaration
  functionDeclarations.forEach((path) => {
    if (path.node.id) {
      const functionName = path.node.id.name as string;

      // Extract function calls in if conditions
      extractFunctionCallInIfCondition(path, j);

      // Create the timing code
      const timingCode = [
        j.expressionStatement(j.literal("/* --instrumentation-- */")),
        // Increment call counter
        j.expressionStatement(
          j.assignmentExpression(
            "+=",
            j.memberExpression(
              j.callExpression(
                j.memberExpression(
                  j.identifier("timingsMap"),
                  j.identifier("get")
                ),
                [j.stringLiteral(functionName)]
              ),
              j.identifier("calls")
            ),
            j.numericLiteral(1)
          )
        ),
        // Start timing
        j.variableDeclaration("let", [
          j.variableDeclarator(
            j.identifier("startTime"),
            j.callExpression(
              j.memberExpression(
                j.identifier("performance"),
                j.identifier("now")
              ),
              []
            )
          ),
        ]),
        // Initialize local duration
        j.variableDeclaration("let", [
          j.variableDeclarator(
            j.identifier("localDuration"),
            j.numericLiteral(0)
          ),
        ]),
        j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
      ];

      // Create the end timing code
      const endTimingCode = [
        j.expressionStatement(j.literal("/* --instrumentation-- */")),
        // Calculate local duration
        j.expressionStatement(
          j.assignmentExpression(
            "+=",
            j.identifier("localDuration"),
            j.binaryExpression(
              "-",
              j.callExpression(
                j.memberExpression(
                  j.identifier("performance"),
                  j.identifier("now")
                ),
                []
              ),
              j.identifier("startTime")
            )
          )
        ),
        // Add to total duration
        j.expressionStatement(
          j.assignmentExpression(
            "+=",
            j.memberExpression(
              j.callExpression(
                j.memberExpression(
                  j.identifier("timingsMap"),
                  j.identifier("get")
                ),
                [j.stringLiteral(functionName)]
              ),
              j.identifier("totalDuration")
            ),
            j.identifier("localDuration")
          )
        ),
        j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
      ];

      // Insert timing code at the beginning of the function body
      path.node.body.body.unshift(...timingCode);

      // Find all inner function calls
      const innerFunctionCalls = j(path)
        .find(j.CallExpression)
        .filter((callPath) => {
          const callee = callPath.node.callee;
          if (j.Identifier.check(callee)) {
            return functionNames.indexOf(callee.name) !== -1;
          }
          return false;
        });

      // Insert timing code around inner function calls
      innerFunctionCalls.forEach((callPath) => {
        // Find the parent statement (either ExpressionStatement or VariableDeclaration)
        let currentPath = callPath;
        while (
          currentPath &&
          !j.ExpressionStatement.check(currentPath.node) &&
          !j.VariableDeclaration.check(currentPath.node)
        ) {
          currentPath = currentPath.parent;
        }

        if (
          currentPath &&
          currentPath.parent &&
          Array.isArray(currentPath.parent.node.body)
        ) {
          const parentBody = currentPath.parent.node.body;
          const callIndex = parentBody.indexOf(currentPath.node);

          // Insert timing code before the call
          if (callIndex !== -1) {
            // Create timing code for before the call
            const beforeCallCode = [
              j.expressionStatement(j.literal("/* --instrumentation-- */")),
              // Calculate local duration
              j.expressionStatement(
                j.assignmentExpression(
                  "+=",
                  j.identifier("localDuration"),
                  j.binaryExpression(
                    "-",
                    j.callExpression(
                      j.memberExpression(
                        j.identifier("performance"),
                        j.identifier("now")
                      ),
                      []
                    ),
                    j.identifier("startTime")
                  )
                )
              ),
              j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
            ];

            // Create timing code for after the call
            const afterCallCode = [
              j.expressionStatement(j.literal("/* --instrumentation-- */")),
              // Reset start time
              j.expressionStatement(
                j.assignmentExpression(
                  "=",
                  j.identifier("startTime"),
                  j.callExpression(
                    j.memberExpression(
                      j.identifier("performance"),
                      j.identifier("now")
                    ),
                    []
                  )
                )
              ),
              j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
            ];

            // Insert the timing code and move the call
            const callNode = currentPath.node;
            parentBody.splice(callIndex, 1); // Remove the original call

            // Insert timing code before the call
            parentBody.splice(callIndex, 0, ...beforeCallCode);

            // Insert the call
            parentBody.splice(callIndex + beforeCallCode.length, 0, callNode);

            // Insert timing code after the call
            parentBody.splice(
              callIndex + beforeCallCode.length + 1,
              0,
              ...afterCallCode
            );
          }
        }
      });

      // Find all return statements in the function body, including those in nested blocks
      const returnPaths = j(path)
        .find(j.ReturnStatement)
        .filter((returnPath) => {
          // Check if this return statement belongs to this function
          let currentPath: ASTPath<Node> | null = returnPath;
          while (currentPath && currentPath.node !== path.node) {
            const node = currentPath.node;
            if (
              node &&
              (j.FunctionDeclaration.check(node) ||
                j.FunctionExpression.check(node) ||
                j.ArrowFunctionExpression.check(node))
            ) {
              // This return belongs to a nested function
              return false;
            }
            currentPath = currentPath.parent;
          }
          return true;
        });

      // Insert timing code before each return statement
      returnPaths.forEach((returnPath) => {
        // Get the parent statement list
        let parentBody;
        let returnNode = returnPath.node;

        // If the parent is an IfStatement, we need to wrap the consequent in a BlockStatement
        if (j.IfStatement.check(returnPath.parent.node)) {
          const ifStatement = returnPath.parent.node;
          if (ifStatement.consequent === returnNode) {
            // Create a new BlockStatement
            const blockStatement = j.blockStatement([returnNode]);
            // Replace the consequent with the BlockStatement
            ifStatement.consequent = blockStatement;
            // Update the parent body and return node references
            parentBody = blockStatement.body;
          } else if (ifStatement.alternate === returnNode) {
            // Create a new BlockStatement
            const blockStatement = j.blockStatement([returnNode]);
            // Replace the alternate with the BlockStatement
            ifStatement.alternate = blockStatement;
            // Update the parent body and return node references
            parentBody = blockStatement.body;
          } else {
            // Return is nested deeper, get the parent BlockStatement
            parentBody = returnPath.parent.node.body;
          }
        } else {
          // Normal case - parent is a BlockStatement
          parentBody = returnPath.parent.node.body;
        }

        // Find the index of the return statement in its parent block
        const returnIndex = parentBody.indexOf(returnNode);

        // Insert the timing code before the return statement
        parentBody.splice(returnIndex, 0, ...endTimingCode);
      });

      // If there are no return statements, append the end timing code at the end
      if (returnPaths.length === 0) {
        path.node.body.body.push(...endTimingCode);
      }
    }
  });

  // Transform each arrow function
  arrowFunctions.forEach((path) => {
    path.node.declarations.forEach((declaration) => {
      if (
        j.VariableDeclarator.check(declaration) &&
        j.Identifier.check(declaration.id) &&
        declaration.init &&
        j.ArrowFunctionExpression.check(declaration.init)
      ) {
        const functionName = declaration.id.name;
        const arrowFunction = declaration.init;

        // Extract function calls in if conditions
        extractFunctionCallInIfCondition(path, j);

        // Create the timing code
        const timingCode = [
          j.expressionStatement(j.literal("/* --instrumentation-- */")),
          // Increment call counter
          j.expressionStatement(
            j.assignmentExpression(
              "+=",
              j.memberExpression(
                j.callExpression(
                  j.memberExpression(
                    j.identifier("timingsMap"),
                    j.identifier("get")
                  ),
                  [j.stringLiteral(functionName)]
                ),
                j.identifier("calls")
              ),
              j.numericLiteral(1)
            )
          ),
          // Start timing
          j.variableDeclaration("let", [
            j.variableDeclarator(
              j.identifier("startTime"),
              j.callExpression(
                j.memberExpression(
                  j.identifier("performance"),
                  j.identifier("now")
                ),
                []
              )
            ),
          ]),
          // Initialize local duration
          j.variableDeclaration("let", [
            j.variableDeclarator(
              j.identifier("localDuration"),
              j.numericLiteral(0)
            ),
          ]),
          j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
        ];

        // Create the end timing code
        const endTimingCode = [
          j.expressionStatement(j.literal("/* --instrumentation-- */")),
          // Calculate local duration
          j.expressionStatement(
            j.assignmentExpression(
              "+=",
              j.identifier("localDuration"),
              j.binaryExpression(
                "-",
                j.callExpression(
                  j.memberExpression(
                    j.identifier("performance"),
                    j.identifier("now")
                  ),
                  []
                ),
                j.identifier("startTime")
              )
            )
          ),
          // Add to total duration
          j.expressionStatement(
            j.assignmentExpression(
              "+=",
              j.memberExpression(
                j.callExpression(
                  j.memberExpression(
                    j.identifier("timingsMap"),
                    j.identifier("get")
                  ),
                  [j.stringLiteral(functionName)]
                ),
                j.identifier("totalDuration")
              ),
              j.identifier("localDuration")
            )
          ),
          j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
        ];

        // Check if the arrow function has a block body
        if (j.BlockStatement.check(arrowFunction.body)) {
          // Insert timing code at the beginning of the function body
          arrowFunction.body.body.unshift(...timingCode);

          // Find all inner function calls
          const innerFunctionCalls = j(path)
            .find(j.CallExpression)
            .filter((callPath) => {
              const callee = callPath.node.callee;
              if (j.Identifier.check(callee)) {
                return functionNames.indexOf(callee.name) !== -1;
              }
              return false;
            });

          // Insert timing code around inner function calls
          innerFunctionCalls.forEach((callPath) => {
            // Find the parent statement (either ExpressionStatement or VariableDeclaration)
            let currentPath = callPath;
            while (
              currentPath &&
              !j.ExpressionStatement.check(currentPath.node) &&
              !j.VariableDeclaration.check(currentPath.node)
            ) {
              currentPath = currentPath.parent;
            }

            if (
              currentPath &&
              currentPath.parent &&
              Array.isArray(currentPath.parent.node.body)
            ) {
              const parentBody = currentPath.parent.node.body;
              const callIndex = parentBody.indexOf(currentPath.node);

              // Insert timing code before the call
              if (callIndex !== -1) {
                // Create timing code for before the call
                const beforeCallCode = [
                  j.expressionStatement(j.literal("/* --instrumentation-- */")),
                  // Calculate local duration
                  j.expressionStatement(
                    j.assignmentExpression(
                      "+=",
                      j.identifier("localDuration"),
                      j.binaryExpression(
                        "-",
                        j.callExpression(
                          j.memberExpression(
                            j.identifier("performance"),
                            j.identifier("now")
                          ),
                          []
                        ),
                        j.identifier("startTime")
                      )
                    )
                  ),
                  j.expressionStatement(
                    j.literal("/* --end-instrumentation-- */")
                  ),
                ];

                // Create timing code for after the call
                const afterCallCode = [
                  j.expressionStatement(j.literal("/* --instrumentation-- */")),
                  // Reset start time
                  j.expressionStatement(
                    j.assignmentExpression(
                      "=",
                      j.identifier("startTime"),
                      j.callExpression(
                        j.memberExpression(
                          j.identifier("performance"),
                          j.identifier("now")
                        ),
                        []
                      )
                    )
                  ),
                  j.expressionStatement(
                    j.literal("/* --end-instrumentation-- */")
                  ),
                ];

                // Insert the timing code and move the call
                const callNode = currentPath.node;
                parentBody.splice(callIndex, 1); // Remove the original call

                // Insert timing code before the call
                parentBody.splice(callIndex, 0, ...beforeCallCode);

                // Insert the call
                parentBody.splice(
                  callIndex + beforeCallCode.length,
                  0,
                  callNode
                );

                // Insert timing code after the call
                parentBody.splice(
                  callIndex + beforeCallCode.length + 1,
                  0,
                  ...afterCallCode
                );
              }
            }
          });

          // Find all return statements in the function body, including those in nested blocks
          const returnPaths = j(path)
            .find(j.ReturnStatement)
            .filter((returnPath) => {
              // Check if this return statement belongs to this function
              let currentPath: ASTPath<Node> | null = returnPath;
              while (currentPath && currentPath.node !== arrowFunction) {
                const node = currentPath.node;
                if (
                  node &&
                  (j.FunctionDeclaration.check(node) ||
                    j.FunctionExpression.check(node) ||
                    j.ArrowFunctionExpression.check(node))
                ) {
                  // This return belongs to a nested function
                  return false;
                }
                currentPath = currentPath.parent;
              }
              return true;
            });

          // Insert timing code before each return statement
          returnPaths.forEach((returnPath) => {
            // Get the parent statement list
            let parentBody;
            let returnNode = returnPath.node;

            // If the parent is an IfStatement, we need to wrap the consequent in a BlockStatement
            if (j.IfStatement.check(returnPath.parent.node)) {
              const ifStatement = returnPath.parent.node;
              if (ifStatement.consequent === returnNode) {
                // Create a new BlockStatement
                const blockStatement = j.blockStatement([returnNode]);
                // Replace the consequent with the BlockStatement
                ifStatement.consequent = blockStatement;
                // Update the parent body and return node references
                parentBody = blockStatement.body;
              } else if (ifStatement.alternate === returnNode) {
                // Create a new BlockStatement
                const blockStatement = j.blockStatement([returnNode]);
                // Replace the alternate with the BlockStatement
                ifStatement.alternate = blockStatement;
                // Update the parent body and return node references
                parentBody = blockStatement.body;
              } else {
                // Return is nested deeper, get the parent BlockStatement
                parentBody = returnPath.parent.node.body;
              }
            } else {
              // Normal case - parent is a BlockStatement
              parentBody = returnPath.parent.node.body;
            }

            // Find the index of the return statement in its parent block
            const returnIndex = parentBody.indexOf(returnNode);

            // Insert the timing code before the return statement
            parentBody.splice(returnIndex, 0, ...endTimingCode);
          });

          // If there are no return statements, append the end timing code at the end
          if (returnPaths.length === 0) {
            arrowFunction.body.body.push(...endTimingCode);
          }
        } else {
          // For arrow functions with expression bodies, we need to wrap the expression in a block
          // and add the timing code
          const originalExpression = arrowFunction.body;

          // Create a new block statement with the timing code and the original expression
          arrowFunction.body = j.blockStatement([
            ...timingCode,
            j.variableDeclaration("const", [
              j.variableDeclarator(j.identifier("result"), originalExpression),
            ]),
            ...endTimingCode,
            j.returnStatement(j.identifier("result")),
          ]);
        }
      }
    });
  });

  // Transform each object method assignment
  objectMethodAssignments.forEach((path) => {
    const node = path.node;
    if (
      j.MemberExpression.check(node.left) &&
      j.Identifier.check(node.left.property)
    ) {
      const functionName = node.left.property.name;
      const functionExpression = node.right;

      // Extract function calls in if conditions
      extractFunctionCallInIfCondition(path, j);

      // Create the timing code
      const timingCode = [
        j.expressionStatement(j.literal("/* --instrumentation-- */")),
        // Increment call counter
        j.expressionStatement(
          j.assignmentExpression(
            "+=",
            j.memberExpression(
              j.callExpression(
                j.memberExpression(
                  j.identifier("timingsMap"),
                  j.identifier("get")
                ),
                [j.stringLiteral(functionName)]
              ),
              j.identifier("calls")
            ),
            j.numericLiteral(1)
          )
        ),
        // Start timing
        j.variableDeclaration("let", [
          j.variableDeclarator(
            j.identifier("startTime"),
            j.callExpression(
              j.memberExpression(
                j.identifier("performance"),
                j.identifier("now")
              ),
              []
            )
          ),
        ]),
        // Initialize local duration
        j.variableDeclaration("let", [
          j.variableDeclarator(
            j.identifier("localDuration"),
            j.numericLiteral(0)
          ),
        ]),
        j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
      ];

      // Create the end timing code
      const endTimingCode = [
        j.expressionStatement(j.literal("/* --instrumentation-- */")),
        // Calculate local duration
        j.expressionStatement(
          j.assignmentExpression(
            "+=",
            j.identifier("localDuration"),
            j.binaryExpression(
              "-",
              j.callExpression(
                j.memberExpression(
                  j.identifier("performance"),
                  j.identifier("now")
                ),
                []
              ),
              j.identifier("startTime")
            )
          )
        ),
        // Add to total duration
        j.expressionStatement(
          j.assignmentExpression(
            "+=",
            j.memberExpression(
              j.callExpression(
                j.memberExpression(
                  j.identifier("timingsMap"),
                  j.identifier("get")
                ),
                [j.stringLiteral(functionName)]
              ),
              j.identifier("totalDuration")
            ),
            j.identifier("localDuration")
          )
        ),
        j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
      ];

      // Insert timing code at the beginning of the function body
      if (
        j.FunctionExpression.check(functionExpression) &&
        j.BlockStatement.check(functionExpression.body)
      ) {
        functionExpression.body.body.unshift(...timingCode);
      }

      // Find all inner function calls
      const innerFunctionCalls = j(path)
        .find(j.CallExpression)
        .filter((callPath) => {
          const callee = callPath.node.callee;
          if (j.Identifier.check(callee)) {
            return functionNames.indexOf(callee.name) !== -1;
          }
          return false;
        });

      // Insert timing code around inner function calls
      innerFunctionCalls.forEach((callPath) => {
        // Find the parent statement (either ExpressionStatement or VariableDeclaration)
        let currentPath = callPath;
        while (
          currentPath &&
          !j.ExpressionStatement.check(currentPath.node) &&
          !j.VariableDeclaration.check(currentPath.node)
        ) {
          currentPath = currentPath.parent;
        }

        if (
          currentPath &&
          currentPath.parent &&
          Array.isArray(currentPath.parent.node.body)
        ) {
          const parentBody = currentPath.parent.node.body;
          const callIndex = parentBody.indexOf(currentPath.node);

          // Insert timing code before the call
          if (callIndex !== -1) {
            // Create timing code for before the call
            const beforeCallCode = [
              j.expressionStatement(j.literal("/* --instrumentation-- */")),
              // Calculate local duration
              j.expressionStatement(
                j.assignmentExpression(
                  "+=",
                  j.identifier("localDuration"),
                  j.binaryExpression(
                    "-",
                    j.callExpression(
                      j.memberExpression(
                        j.identifier("performance"),
                        j.identifier("now")
                      ),
                      []
                    ),
                    j.identifier("startTime")
                  )
                )
              ),
              j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
            ];

            // Create timing code for after the call
            const afterCallCode = [
              j.expressionStatement(j.literal("/* --instrumentation-- */")),
              // Reset start time
              j.expressionStatement(
                j.assignmentExpression(
                  "=",
                  j.identifier("startTime"),
                  j.callExpression(
                    j.memberExpression(
                      j.identifier("performance"),
                      j.identifier("now")
                    ),
                    []
                  )
                )
              ),
              j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
            ];

            // Insert the timing code and move the call
            const callNode = currentPath.node;
            parentBody.splice(callIndex, 1); // Remove the original call

            // Insert timing code before the call
            parentBody.splice(callIndex, 0, ...beforeCallCode);

            // Insert the call
            parentBody.splice(callIndex + beforeCallCode.length, 0, callNode);

            // Insert timing code after the call
            parentBody.splice(
              callIndex + beforeCallCode.length + 1,
              0,
              ...afterCallCode
            );
          }
        }
      });

      // Find all return statements in the function body, including those in nested blocks
      const returnPaths = j(path)
        .find(j.ReturnStatement)
        .filter((returnPath) => {
          // Check if this return statement belongs to this function
          let currentPath: ASTPath<Node> | null = returnPath;
          while (currentPath && currentPath.node !== functionExpression) {
            const node = currentPath.node;
            if (
              node &&
              (j.FunctionDeclaration.check(node) ||
                j.FunctionExpression.check(node) ||
                j.ArrowFunctionExpression.check(node))
            ) {
              // This return belongs to a nested function
              return false;
            }
            currentPath = currentPath.parent;
          }
          return true;
        });

      // Insert timing code before each return statement
      returnPaths.forEach((returnPath) => {
        // Get the parent statement list
        let parentBody;
        let returnNode = returnPath.node;

        // If the parent is an IfStatement, we need to wrap the consequent in a BlockStatement
        if (j.IfStatement.check(returnPath.parent.node)) {
          const ifStatement = returnPath.parent.node;
          if (ifStatement.consequent === returnNode) {
            // Create a new BlockStatement
            const blockStatement = j.blockStatement([returnNode]);
            // Replace the consequent with the BlockStatement
            ifStatement.consequent = blockStatement;
            // Update the parent body and return node references
            parentBody = blockStatement.body;
          } else if (ifStatement.alternate === returnNode) {
            // Create a new BlockStatement
            const blockStatement = j.blockStatement([returnNode]);
            // Replace the alternate with the BlockStatement
            ifStatement.alternate = blockStatement;
            // Update the parent body and return node references
            parentBody = blockStatement.body;
          } else {
            // Return is nested deeper, get the parent BlockStatement
            parentBody = returnPath.parent.node.body;
          }
        } else {
          // Normal case - parent is a BlockStatement
          parentBody = returnPath.parent.node.body;
        }

        // Find the index of the return statement in its parent block
        const returnIndex = parentBody.indexOf(returnNode);

        // Insert the timing code before the return statement
        parentBody.splice(returnIndex, 0, ...endTimingCode);
      });

      // If there are no return statements, append the end timing code at the end
      if (returnPaths.length === 0) {
        if (
          j.FunctionExpression.check(functionExpression) &&
          j.BlockStatement.check(functionExpression.body)
        ) {
          functionExpression.body.body.push(...endTimingCode);
        }
      }
    }
  });

  // Insert the timingsMap initialization at the beginning of the file
  root.get().node.program.body.unshift(timingsMapInit, ...timingsMapEntries);

  // Add performance test specific code if isPerformanceTest is true
  if (isPerformanceTest) {
    // Create a function to get performance results
    const getPerformanceResults = j.functionDeclaration(
      j.identifier("getPerformanceResults"),
      [],
      j.blockStatement([
        j.returnStatement(
          j.objectExpression(
            functionNames.map((name) =>
              j.objectProperty(
                j.identifier(name),
                j.callExpression(
                  j.memberExpression(
                    j.identifier("timingsMap"),
                    j.identifier("get")
                  ),
                  [j.stringLiteral(name)]
                )
              )
            )
          )
        ),
      ])
    );

    // Add the getPerformanceResults function to the program body
    root.get().node.program.body.push(getPerformanceResults);

    // Add a call to getPerformanceResults at the end of the file
    root
      .get()
      .node.program.body.push(
        j.expressionStatement(
          j.callExpression(j.identifier("getPerformanceResults"), [])
        )
      );
  }

  // Get result string
  const result = root.toSource();

  // Workaround: Replace the instrumentation comment literals with actual comments
  // Opening comments get a new line before them, and have the "quote" characters removed
  // Closing comments get a new line after them, and have the "quote" characters removed
  return result
    .replace(/(^|\s+)"(\/\* --instrumentation-- \*\/)"(;?)/g, "\n$1$2")
    .replace(/(^|\s+)"(\/\* --end-instrumentation-- \*\/)"(;?)/g, "$1$2\n");
}
