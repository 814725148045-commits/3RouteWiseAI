/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runOptimizationUnitTests } from './unitTests';

console.log('====================================================');
console.log('Running RouteWise AI Optimization Verification Tests');
console.log('====================================================\n');

const suite = runOptimizationUnitTests();

let allPassed = true;

for (const test of suite.results) {
  const icon = test.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${test.id}] ${test.scenario}`);
  console.log(`   Message: ${test.message}\n`);
  if (!test.passed) {
    allPassed = false;
  }
}

console.log('----------------------------------------------------');
console.log(`Summary: ${suite.passedTests}/${suite.totalTests} tests passed in ${suite.durationMs}ms`);
console.log('----------------------------------------------------');

if (!allPassed) {
  process.exit(1);
} else {
  process.exit(0);
}
