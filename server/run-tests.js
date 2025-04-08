/**
 * Test runner script that ensures all mocks are properly set up
 * before running Jest tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if test environment file exists
const testEnvPath = path.join(__dirname, 'tests', '.env.test');
if (!fs.existsSync(testEnvPath)) {
  console.error('Test environment file not found at', testEnvPath);
  process.exit(1);
}

// Get command line arguments to pass to Jest
const args = process.argv.slice(2);
let jestCommand = 'jest --config=jest.config.js';

// Add any additional arguments passed to this script
if (args.length > 0) {
  jestCommand += ' ' + args.join(' ');
}

// Run the tests with proper configuration
try {
  console.log(`Running tests with command: ${jestCommand}`);
  execSync(jestCommand, { stdio: 'inherit' });
} catch (error) {
  // Jest will return a non-zero exit code if tests fail
  // We don't need to handle this error specially
  process.exit(error.status);
}
