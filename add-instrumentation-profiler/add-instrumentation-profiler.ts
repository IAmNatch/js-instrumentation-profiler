import type { API, FileInfo } from 'jscodeshift';

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
        ])
      ];
      
      // Create the end timing code
      const endTimingCode = [
        // Calculate local duration
        j.expressionStatement(
          j.assignmentExpression(
            '=',
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
        )
      ];
      
      // Insert timing code at the beginning of the function body
      path.node.body.body.unshift(...timingCode);
      
      // Insert end timing code at the end of the function body
      path.node.body.body.push(...endTimingCode);
    }
  });
  
  // Insert the timingsMap initialization at the beginning of the file
  root.get().node.program.body.unshift(timingsMapInit, ...timingsMapEntries);
  
  return root.toSource();
}