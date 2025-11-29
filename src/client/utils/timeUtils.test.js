import { secondsToDhms } from './timeUtils';

// Test the time conversion function
console.log('Testing secondsToDhms function:');

// Test cases
const testCases = [
  { input: 0, expected: '0:00:00:00' },
  { input: 1, expected: '00:00:00:01' },
  { input: 60, expected: '00:00:01:00' },
  { input: 3600, expected: '00:01:00:00' },
  { input: 86400, expected: '01:00:00:00' },
  { input: 90061, expected: '01:01:01:01' }, // 1 day, 1 hour, 1 minute, 1 second
  { input: 123456, expected: '01:10:17:36' }, // 1 day, 10 hours, 17 minutes, 36 seconds
  { input: null, expected: '00:00:00:00' },
  { input: undefined, expected: '00:00:00:00' },
];

testCases.forEach(({ input, expected }) => {
  const result = secondsToDhms(input);
  const passed = result === expected;
  console.log(`Input: ${input} -> Output: ${result} (Expected: ${expected}) ${passed ? '✓' : '✗'}`);
});

console.log('Test completed!');