export default function transformer(file, api, options = {}) {
    const j = api.jscodeshift;
    const root = j(file.source);
    const isPerformanceTest = options.isPerformanceTest || false;
    // Find all function declarations and arrow functions
    const functionDeclarations = root.find(j.FunctionDeclaration);
    const arrowFunctions = root.find(j.VariableDeclaration).filter((path) => {
        // Check if this is a variable declaration with an arrow function
        return path.node.declarations.some((declaration) => j.VariableDeclarator.check(declaration) &&
            declaration.init &&
            j.ArrowFunctionExpression.check(declaration.init));
    });
    // Create a map to store function names
    const functionNames = [];
    // Collect all function names from function declarations
    functionDeclarations.forEach((path) => {
        if (path.node.id) {
            functionNames.push(path.node.id.name);
        }
    });
    // Collect all function names from arrow functions
    arrowFunctions.forEach((path) => {
        path.node.declarations.forEach((declaration) => {
            if (j.VariableDeclarator.check(declaration) &&
                j.Identifier.check(declaration.id)) {
                functionNames.push(declaration.id.name);
            }
        });
    });
    // Create the timingsMap initialization
    const timingsMapInit = j.variableDeclaration("const", [
        j.variableDeclarator(j.identifier("timingsMap"), j.newExpression(j.identifier("Map"), [])),
    ]);
    // Add entries to the timingsMap for each function
    const timingsMapEntries = functionNames.map((name) => j.expressionStatement(j.callExpression(j.memberExpression(j.identifier("timingsMap"), j.identifier("set")), [
        j.stringLiteral(name),
        j.objectExpression([
            j.objectProperty(j.identifier("totalDuration"), j.numericLiteral(0)),
            j.objectProperty(j.identifier("calls"), j.numericLiteral(0)),
        ]),
    ])));
    // Transform each function declaration
    functionDeclarations.forEach((path) => {
        if (path.node.id) {
            const functionName = path.node.id.name;
            // Create the timing code
            const timingCode = [
                j.expressionStatement(j.literal("/* --instrumentation-- */")),
                // Increment call counter
                j.expressionStatement(j.assignmentExpression("+=", j.memberExpression(j.callExpression(j.memberExpression(j.identifier("timingsMap"), j.identifier("get")), [j.stringLiteral(functionName)]), j.identifier("calls")), j.numericLiteral(1))),
                // Start timing
                j.variableDeclaration("let", [
                    j.variableDeclarator(j.identifier("startTime"), j.callExpression(j.memberExpression(j.identifier("performance"), j.identifier("now")), [])),
                ]),
                // Initialize local duration
                j.variableDeclaration("let", [
                    j.variableDeclarator(j.identifier("localDuration"), j.numericLiteral(0)),
                ]),
                j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
            ];
            // Create the end timing code
            const endTimingCode = [
                j.expressionStatement(j.literal("/* --instrumentation-- */")),
                // Calculate local duration
                j.expressionStatement(j.assignmentExpression("+=", j.identifier("localDuration"), j.binaryExpression("-", j.callExpression(j.memberExpression(j.identifier("performance"), j.identifier("now")), []), j.identifier("startTime")))),
                // Add to total duration
                j.expressionStatement(j.assignmentExpression("+=", j.memberExpression(j.callExpression(j.memberExpression(j.identifier("timingsMap"), j.identifier("get")), [j.stringLiteral(functionName)]), j.identifier("totalDuration")), j.identifier("localDuration"))),
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
                while (currentPath &&
                    !j.ExpressionStatement.check(currentPath.node) &&
                    !j.VariableDeclaration.check(currentPath.node)) {
                    currentPath = currentPath.parent;
                }
                if (currentPath &&
                    currentPath.parent &&
                    Array.isArray(currentPath.parent.node.body)) {
                    const parentBody = currentPath.parent.node.body;
                    const callIndex = parentBody.indexOf(currentPath.node);
                    // Insert timing code before the call
                    if (callIndex !== -1) {
                        // Create timing code for before the call
                        const beforeCallCode = [
                            j.expressionStatement(j.literal("/* --instrumentation-- */")),
                            // Calculate local duration
                            j.expressionStatement(j.assignmentExpression("+=", j.identifier("localDuration"), j.binaryExpression("-", j.callExpression(j.memberExpression(j.identifier("performance"), j.identifier("now")), []), j.identifier("startTime")))),
                            j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
                        ];
                        // Create timing code for after the call
                        const afterCallCode = [
                            j.expressionStatement(j.literal("/* --instrumentation-- */")),
                            // Reset start time
                            j.expressionStatement(j.assignmentExpression("=", j.identifier("startTime"), j.callExpression(j.memberExpression(j.identifier("performance"), j.identifier("now")), []))),
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
                        parentBody.splice(callIndex + beforeCallCode.length + 1, 0, ...afterCallCode);
                    }
                }
            });
            // Find all return statements in the function body, including those in nested blocks
            const returnPaths = j(path)
                .find(j.ReturnStatement)
                .filter((returnPath) => {
                // Check if this return statement belongs to this function
                let currentPath = returnPath;
                while (currentPath && currentPath.node !== path.node) {
                    const node = currentPath.node;
                    if (node &&
                        (j.FunctionDeclaration.check(node) ||
                            j.FunctionExpression.check(node) ||
                            j.ArrowFunctionExpression.check(node))) {
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
                const parentBody = returnPath.parent.node.body;
                // Find the index of the return statement in its parent block
                const returnIndex = parentBody.indexOf(returnPath.node);
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
            if (j.VariableDeclarator.check(declaration) &&
                j.Identifier.check(declaration.id) &&
                declaration.init &&
                j.ArrowFunctionExpression.check(declaration.init)) {
                const functionName = declaration.id.name;
                const arrowFunction = declaration.init;
                // Create the timing code
                const timingCode = [
                    j.expressionStatement(j.literal("/* --instrumentation-- */")),
                    // Increment call counter
                    j.expressionStatement(j.assignmentExpression("+=", j.memberExpression(j.callExpression(j.memberExpression(j.identifier("timingsMap"), j.identifier("get")), [j.stringLiteral(functionName)]), j.identifier("calls")), j.numericLiteral(1))),
                    // Start timing
                    j.variableDeclaration("let", [
                        j.variableDeclarator(j.identifier("startTime"), j.callExpression(j.memberExpression(j.identifier("performance"), j.identifier("now")), [])),
                    ]),
                    // Initialize local duration
                    j.variableDeclaration("let", [
                        j.variableDeclarator(j.identifier("localDuration"), j.numericLiteral(0)),
                    ]),
                    j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
                ];
                // Create the end timing code
                const endTimingCode = [
                    j.expressionStatement(j.literal("/* --instrumentation-- */")),
                    // Calculate local duration
                    j.expressionStatement(j.assignmentExpression("+=", j.identifier("localDuration"), j.binaryExpression("-", j.callExpression(j.memberExpression(j.identifier("performance"), j.identifier("now")), []), j.identifier("startTime")))),
                    // Add to total duration
                    j.expressionStatement(j.assignmentExpression("+=", j.memberExpression(j.callExpression(j.memberExpression(j.identifier("timingsMap"), j.identifier("get")), [j.stringLiteral(functionName)]), j.identifier("totalDuration")), j.identifier("localDuration"))),
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
                        while (currentPath &&
                            !j.ExpressionStatement.check(currentPath.node) &&
                            !j.VariableDeclaration.check(currentPath.node)) {
                            currentPath = currentPath.parent;
                        }
                        if (currentPath &&
                            currentPath.parent &&
                            Array.isArray(currentPath.parent.node.body)) {
                            const parentBody = currentPath.parent.node.body;
                            const callIndex = parentBody.indexOf(currentPath.node);
                            // Insert timing code before the call
                            if (callIndex !== -1) {
                                // Create timing code for before the call
                                const beforeCallCode = [
                                    j.expressionStatement(j.literal("/* --instrumentation-- */")),
                                    // Calculate local duration
                                    j.expressionStatement(j.assignmentExpression("+=", j.identifier("localDuration"), j.binaryExpression("-", j.callExpression(j.memberExpression(j.identifier("performance"), j.identifier("now")), []), j.identifier("startTime")))),
                                    j.expressionStatement(j.literal("/* --end-instrumentation-- */")),
                                ];
                                // Create timing code for after the call
                                const afterCallCode = [
                                    j.expressionStatement(j.literal("/* --instrumentation-- */")),
                                    // Reset start time
                                    j.expressionStatement(j.assignmentExpression("=", j.identifier("startTime"), j.callExpression(j.memberExpression(j.identifier("performance"), j.identifier("now")), []))),
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
                                parentBody.splice(callIndex + beforeCallCode.length + 1, 0, ...afterCallCode);
                            }
                        }
                    });
                    // Find all return statements in the function body, including those in nested blocks
                    const returnPaths = j(path)
                        .find(j.ReturnStatement)
                        .filter((returnPath) => {
                        // Check if this return statement belongs to this function
                        let currentPath = returnPath;
                        while (currentPath && currentPath.node !== arrowFunction) {
                            const node = currentPath.node;
                            if (node &&
                                (j.FunctionDeclaration.check(node) ||
                                    j.FunctionExpression.check(node) ||
                                    j.ArrowFunctionExpression.check(node))) {
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
                        const parentBody = returnPath.parent.node.body;
                        // Find the index of the return statement in its parent block
                        const returnIndex = parentBody.indexOf(returnPath.node);
                        // Insert the timing code before the return statement
                        parentBody.splice(returnIndex, 0, ...endTimingCode);
                    });
                    // If there are no return statements, append the end timing code at the end
                    if (returnPaths.length === 0) {
                        arrowFunction.body.body.push(...endTimingCode);
                    }
                }
                else {
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
    // Insert the timingsMap initialization at the beginning of the file
    root.get().node.program.body.unshift(timingsMapInit, ...timingsMapEntries);
    // Add performance test specific code if isPerformanceTest is true
    if (isPerformanceTest) {
        // Create a function to get performance results
        const getPerformanceResults = j.functionDeclaration(j.identifier("getPerformanceResults"), [], j.blockStatement([
            j.returnStatement(j.objectExpression(functionNames.map((name) => j.objectProperty(j.identifier(name), j.callExpression(j.memberExpression(j.identifier("timingsMap"), j.identifier("get")), [j.stringLiteral(name)]))))),
        ]));
        // Add the getPerformanceResults function to the program body
        root.get().node.program.body.push(getPerformanceResults);
        // Add a call to getPerformanceResults at the end of the file
        root
            .get()
            .node.program.body.push(j.expressionStatement(j.callExpression(j.identifier("getPerformanceResults"), [])));
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
