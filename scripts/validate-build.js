import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Explicitly declare globals to satisfy linter
/* global console, process */

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');

// Check if the build output exists
const buildOutput = path.join(projectRoot, 'dist', 'js-instrumentation-profiler', 'js-instrumentation-profiler.js');
if (!fs.existsSync(buildOutput)) {
  console.error('Build output not found. Run npm run build first.');
  process.exit(1);
}

// Try to run jscodeshift with the build output on a sample file
const sampleFile = path.join(projectRoot, 'test', 'sample.js');
if (!fs.existsSync(sampleFile)) {
  fs.writeFileSync(sampleFile, 'function test() { console.log("test"); }');
}

try {
  // Try to run jscodeshift with the build output
  execSync(`npx jscodeshift -t ${buildOutput} ${sampleFile} --dry --print`);
  console.log('✅ Build output is compatible with jscodeshift');
} catch (error) {
  console.error('❌ Build output is not compatible with jscodeshift:', error.message);
  process.exit(1);
} 