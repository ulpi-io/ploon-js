import { readFileSync } from 'fs';

const orig = JSON.parse(readFileSync('/Users/ciprian/work/___ulpi___/plon.ulpi.io/ploon-js/benchmarks/data/comparison/algolia/data-original.json', 'utf-8'));
const rt = JSON.parse(readFileSync('/Users/ciprian/work/___ulpi___/plon.ulpi.io/ploon-js/benchmarks/data/comparison/algolia/data-roundtrip.json', 'utf-8'));

function deepCompare(obj1, obj2, path = '', differences = []) {
  if (obj1 === obj2) return differences;

  if (obj1 == null || obj2 == null) {
    differences.push({ path, issue: `null mismatch: ${obj1} vs ${obj2}` });
    return differences;
  }

  // Allow string "1" vs number 1
  if (typeof obj1 === 'string' && typeof obj2 === 'number') {
    if (obj1 === String(obj2)) {
      return differences; // Accept this difference
    }
  }

  if (typeof obj1 !== typeof obj2) {
    differences.push({ path, issue: `type: ${typeof obj1} vs ${typeof obj2}, values: ${JSON.stringify(obj1)} vs ${JSON.stringify(obj2)}` });
    return differences;
  }

  if (typeof obj1 !== 'object') {
    if (obj1 !== obj2) {
      differences.push({ path, issue: `value: ${obj1} vs ${obj2}` });
    }
    return differences;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    differences.push({ path, issue: 'array vs object' });
    return differences;
  }

  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) {
      differences.push({ path, issue: `array length: ${obj1.length} vs ${obj2.length}` });
      return differences;
    }
    for (let i = 0; i < obj1.length; i++) {
      deepCompare(obj1[i], obj2[i], `${path}[${i}]`, differences);
    }
    return differences;
  }

  const keys1 = Object.keys(obj1).sort();
  const keys2 = Object.keys(obj2).sort();

  if (keys1.join(',') !== keys2.join(',')) {
    const missing1 = keys2.filter(k => !keys1.includes(k));
    const missing2 = keys1.filter(k => !keys2.includes(k));
    differences.push({ path, issue: `keys - missing in obj1: ${missing1.join(',') || 'none'}, missing in obj2: ${missing2.join(',') || 'none'}` });
    return differences;
  }

  for (const key of keys1) {
    deepCompare(obj1[key], obj2[key], `${path}.${key}`, differences);
  }

  return differences;
}

const differences = deepCompare(orig, rt);

console.log(`Total differences found: ${differences.length}\n`);

if (differences.length > 0) {
  console.log('First 10 differences:\n');
  for (let i = 0; i < Math.min(10, differences.length); i++) {
    console.log(`${i + 1}. ${differences[i].path}`);
    console.log(`   ${differences[i].issue}\n`);
  }
}

if (differences.length === 0) {
  console.log('✅ No differences found (ignoring numeric string normalization)');
}
