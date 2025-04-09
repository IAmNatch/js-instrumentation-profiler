import type { API, FileInfo } from 'jscodeshift';
import { Collection } from 'jscodeshift';
import { Node, ReturnStatement, FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, CallExpression, ExpressionStatement, VariableDeclaration, Identifier } from 'jscodeshift';
import { ASTPath } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  
  // Find all function declarations
  const functionDeclarations = root.find(j.FunctionDeclaration);
  
  // Create a map to store function names
  const functionNames: string[] = [];
  
  // Collect all function names
  functionDeclarations.forEach(path => {
    if (path.node.id) {
      functionNames.push(path.node.id.name as string);
    }
  });
  
  // Create the timingsMap initialization
  const timingsMapInit = j.variableDeclaration('const', [
    j.variableDeclarator(
      j.identifier('timingsMap'),
      j.newExpression(j.identifier('Map'), [])
    )
  ]);
  
  // Add entries to the timingsMap for each function
  const timingsMapEntries = functionNames.map(name => 
    j.expressionStatement(
      j.callExpression(
        j.memberExpression(j.identifier('timingsMap'), j.identifier('set')),
        [
          j.stringLiteral(name),
          j.objectExpression([
            j.objectProperty(j.identifier('totalDuration'), j.numericLiteral(0)),
            j.objectProperty(j.identifier('calls'), j.numericLiteral(0))
          ])
        ]
      )
    )
  );
  
  // Transform each function declaration
  functionDeclarations.forEach(path => {
    if (path.node.id) {
      const functionName = path.node.id.name as string;
      
      // Create the timing code
      const timingCode = [
        j.expressionStatement(
            j.literal("/* --instrumentation-- */")
        ),
        // Increment call counter
        j.expressionStatement(
          j.assignmentExpression(
            '+=',
            j.memberExpression(
              j.callExpression(
                j.memberExpression(j.identifier('timingsMap'), j.identifier('get')),
                [j.stringLiteral(functionName)]
              ),
              j.identifier('calls')
            ),
            j.numericLiteral(1)
          )
        ),
        // Start timing
        j.variableDeclaration('let', [
          j.variableDeclarator(j.identifier('startTime'), 
            j.callExpression(
              j.memberExpression(j.identifier('performance'), j.identifier('now')),
              []
            )
          )
        ]),
        // Initialize local duration
        j.variableDeclaration('let', [
          j.variableDeclarator(j.identifier('localDuration'), j.numericLiteral(0))
        ]),
        j.expressionStatement(
            j.literal("/* --end-instrumentation-- */")
        )
      ];
      
      // Create the end timing code
      const endTimingCode = [
        j.expressionStatement(
            j.literal("/* --instrumentation-- */")
        ),
        // Calculate local duration
        j.expressionStatement(
          j.assignmentExpression(
            '+=',
            j.identifier('localDuration'),
            j.binaryExpression(
              '-',
              j.callExpression(
                j.memberExpression(j.identifier('performance'), j.identifier('now')),
                []
              ),
              j.identifier('startTime')
            )
          )
        ),
        // Add to total duration
        j.expressionStatement(
          j.assignmentExpression(
            '+=',
            j.memberExpression(
              j.callExpression(
                j.memberExpression(j.identifier('timingsMap'), j.identifier('get')),
                [j.stringLiteral(functionName)]
              ),
              j.identifier('totalDuration')
            ),
            j.identifier('localDuration')
          )
        ),
        j.expressionStatement(
            j.literal("/* --end-instrumentation-- */")
        )
      ];

      // Create timing code for inner function calls
      const innerCallTimingCode = [
        j.expressionStatement(
            j.literal("/* --instrumentation-- */")
        ),
        // Calculate local duration
        j.expressionStatement(
          j.assignmentExpression(
            '+=',
            j.identifier('localDuration'),
            j.binaryExpression(
              '-',
              j.callExpression(
                j.memberExpression(j.identifier('performance'), j.identifier('now')),
                []
              ),
              j.identifier('startTime')
            )
          )
        ),
        j.expressionStatement(
            j.literal("/* --end-instrumentation-- */")
        ),
        j.expressionStatement(
            j.literal("/* --instrumentation-- */")
        ),
        // Reset start time
        j.expressionStatement(
          j.assignmentExpression(
            '=',
            j.identifier('startTime'),
            j.callExpression(
              j.memberExpression(j.identifier('performance'), j.identifier('now')),
              []
            )
          )
        ),
        j.expressionStatement(
            j.literal("/* --end-instrumentation-- */")
        )
      ];

      // Insert timing code at the beginning of the function body
      path.node.body.body.unshift(...timingCode);
      
      // Find all inner function calls
      const innerFunctionCalls = j(path).find(j.CallExpression).filter(callPath => {
        const callee = callPath.node.callee;
        if (j.Identifier.check(callee)) {
          return functionNames.indexOf(callee.name) !== -1;
        }
        return false;
      });

      // Insert timing code around inner function calls
      innerFunctionCalls.forEach(callPath => {
        // Find the parent statement (either ExpressionStatement or VariableDeclaration)
        let currentPath = callPath;
        while (currentPath && 
               !j.ExpressionStatement.check(currentPath.node) && 
               !j.VariableDeclaration.check(currentPath.node)) {
          currentPath = currentPath.parent;
        }
        
        if (currentPath && currentPath.parent && Array.isArray(currentPath.parent.node.body)) {
          const parentBody = currentPath.parent.node.body;
          const callIndex = parentBody.indexOf(currentPath.node);
          
          // Insert timing code before the call
          if (callIndex !== -1) {
            // Create timing code for before the call
            const beforeCallCode = [
              j.expressionStatement(
                  j.literal("/* --instrumentation-- */")
              ),
              // Calculate local duration
              j.expressionStatement(
                j.assignmentExpression(
                  '+=',
                  j.identifier('localDuration'),
                  j.binaryExpression(
                    '-',
                    j.callExpression(
                      j.memberExpression(j.identifier('performance'), j.identifier('now')),
                      []
                    ),
                    j.identifier('startTime')
                  )
                )
              ),
              j.expressionStatement(
                  j.literal("/* --end-instrumentation-- */")
              )
            ];

            // Create timing code for after the call
            const afterCallCode = [
              j.expressionStatement(
                  j.literal("/* --instrumentation-- */")
              ),
              // Reset start time
              j.expressionStatement(
                j.assignmentExpression(
                  '=',
                  j.identifier('startTime'),
                  j.callExpression(
                    j.memberExpression(j.identifier('performance'), j.identifier('now')),
                    []
                  )
                )
              ),
              j.expressionStatement(
                  j.literal("/* --end-instrumentation-- */")
              )
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
      const returnPaths = j(path).find(j.ReturnStatement).filter(returnPath => {
        // Check if this return statement belongs to this function
        let currentPath: ASTPath<Node> | null = returnPath;
        while (currentPath && currentPath.node !== path.node) {
          const node = currentPath.node;
          if (node && (j.FunctionDeclaration.check(node) || 
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
      returnPaths.forEach(returnPath => {
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
  
  // Insert the timingsMap initialization at the beginning of the file
  root.get().node.program.body.unshift(timingsMapInit, ...timingsMapEntries);
  
  // Get result string
  const result = root.toSource();
  
  // Workaround: Replace the instrumentation comment literals with actual comments
  // Opening comments get a new line before them, and have the "quote" characters removed
  // Closing comments get a new line after them, and have the "quote" characters removed
  return result
    .replace(/(^|\s+)"(\/\* --instrumentation-- \*\/)"(;?)/g, '\n$1$2')
    .replace(/(^|\s+)"(\/\* --end-instrumentation-- \*\/)"(;?)/g, '$1$2\n')
}