#!/usr/bin/env tsx
/**
 * Main test runner for all roleplay tests
 * Executes all test suites in order and generates comprehensive report
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  script: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Character Selection & Navigation',
    script: 'test-character-selection.ts',
    description: 'Tests direct character selection, scene selection, and character info drawer'
  },
  {
    name: 'Chat Interaction Paths',
    script: 'test-chat-interactions.ts',
    description: 'Tests conversation kickoff, message exchange, scene generation'
  },
  {
    name: 'System Prompt & Template Testing',
    script: 'test-system-prompts.ts',
    description: 'Tests prompt template application, character data integration, scene system prompts'
  },
  {
    name: 'Database State Verification',
    script: 'test-database-state.ts',
    description: 'Tests conversation lifecycle, message persistence, scene image storage'
  }
];

interface TestResult {
  suite: string;
  passed: boolean;
  output: string;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
const startTime = Date.now();

async function runTestSuite(suite: TestSuite): Promise<TestResult> {
  const suiteStartTime = Date.now();
  const scriptPath = path.join(__dirname, suite.script);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Running: ${suite.name}`);
  console.log(`📝 ${suite.description}`);
  console.log('='.repeat(60));

  try {
    const { stdout, stderr } = await execAsync(
      `npx tsx "${scriptPath}"`,
      {
        env: {
          ...process.env,
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
          SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          TEST_USER_ID: process.env.TEST_USER_ID,
          TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'pokercpa05'
        },
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );

    const duration = Date.now() - suiteStartTime;
    const passed = !stderr || stderr.length === 0;

    return {
      suite: suite.name,
      passed,
      output: stdout,
      error: stderr || undefined,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - suiteStartTime;
    return {
      suite: suite.name,
      passed: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      duration
    };
  }
}

async function generateReport() {
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  const report = `
# Roleplay Test Execution Report

**Generated:** ${new Date().toISOString()}
**Total Duration:** ${(totalDuration / 1000).toFixed(2)}s

## Summary

- **Total Test Suites:** ${results.length}
- **Passed:** ${passed}
- **Failed:** ${failed}
- **Success Rate:** ${((passed / results.length) * 100).toFixed(1)}%

## Test Suite Results

${results.map(result => `
### ${result.suite}
- **Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration:** ${(result.duration / 1000).toFixed(2)}s
${result.error ? `- **Error:** ${result.error}` : ''}
`).join('\n')}

## Detailed Output

${results.map(result => `
### ${result.suite}
\`\`\`
${result.output}
${result.error ? `\nError:\n${result.error}` : ''}
\`\`\`
`).join('\n')}

## Next Steps

${failed > 0 ? `
⚠️ **Some tests failed. Please review the errors above and:**
1. Check database state
2. Verify test data setup
3. Review edge function logs
4. Check API model configuration
` : `
✅ **All tests passed!** The roleplay system is functioning correctly.
`}
`;

  const reportPath = path.join(__dirname, 'test-results', `report-${Date.now()}.md`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, report);

  console.log(`\n📄 Test report saved to: ${reportPath}`);
  return report;
}

async function main() {
  console.log('🚀 Roleplay Comprehensive Test Suite');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Check prerequisites
  if (!process.env.VITE_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.error('Set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable');
    console.error('Or configure in Cursor secrets: SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log('ℹ️  Test user lookup: Will search for pokercpa05 user');
  console.log('   Set TEST_USER_ID to use specific user, or TEST_USER_EMAIL to change search');

  // Run all test suites
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);

    if (!result.passed) {
      console.log(`\n❌ ${suite.name} failed`);
    } else {
      console.log(`\n✅ ${suite.name} passed`);
    }
  }

  // Generate report
  const report = await generateReport();
  console.log(report);

  // Exit with appropriate code
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});

