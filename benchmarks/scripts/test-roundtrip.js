import { stringify, parse } from './packages/ploon/dist/index.js'

console.log('🔄 PLOON Round-Trip Test\n')
console.log('Testing: parse(stringify(data)) === data\n')
console.log('='.repeat(60) + '\n')

let totalTests = 0
let passedTests = 0

// Deep equality check that ignores key order
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true
  if (obj1 == null || obj2 == null) return false
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false

  const keys1 = Object.keys(obj1).sort()
  const keys2 = Object.keys(obj2).sort()

  if (keys1.length !== keys2.length) return false
  if (!keys1.every((key, i) => key === keys2[i])) return false

  for (const key of keys1) {
    if (!deepEqual(obj1[key], obj2[key])) return false
  }

  return true
}

function testRoundTrip(name, data) {
  totalTests++
  console.log(`Test: ${name}`)

  try {
    // Convert to PLOON
    const ploon = stringify(data)
    console.log('PLOON output:')
    console.log(ploon.split('\n').slice(0, 10).join('\n'))
    if (ploon.split('\n').length > 10) console.log('...')

    // Parse back
    const result = parse(ploon)

    // Compare using deep equality (ignores key order)
    if (deepEqual(data, result)) {
      console.log('✅ PASS: Round-trip successful!\n')
      passedTests++
      return true
    } else {
      console.log('❌ FAIL: Data mismatch')
      console.log('Original:', JSON.stringify(data, null, 2).slice(0, 300))
      console.log('Decoded:', JSON.stringify(result, null, 2).slice(0, 300))
      console.log()
      return false
    }
  } catch (err) {
    console.log('❌ ERROR:', err.message)
    console.log()
    return false
  }
}

// Test 1: Simple flat data
testRoundTrip('Simple flat array', {
  products: [
    { id: 1, name: 'Widget', price: 9.99 },
    { id: 2, name: 'Gadget', price: 19.99 }
  ]
})

// Test 2: 2-level nesting
testRoundTrip('2-level nesting (products → colors)', {
  products: [
    {
      id: 1,
      name: 'T-Shirt',
      price: 29.99,
      colors: [
        { name: 'Red', hex: '#FF0000' },
        { name: 'Blue', hex: '#0000FF' }
      ]
    }
  ]
})

// Test 3: 3-level nesting
testRoundTrip('3-level nesting (products → colors → sizes)', {
  products: [
    {
      id: 1,
      name: 'T-Shirt',
      price: 29.99,
      colors: [
        {
          name: 'Red',
          hex: '#FF0000',
          sizes: [
            { size: 'S', stock: 50 },
            { size: 'M', stock: 30 },
            { size: 'L', stock: 20 }
          ]
        },
        {
          name: 'Blue',
          hex: '#0000FF',
          sizes: [
            { size: 'S', stock: 40 },
            { size: 'M', stock: 25 }
          ]
        }
      ]
    },
    {
      id: 2,
      name: 'Jeans',
      price: 79.99,
      colors: [
        {
          name: 'Dark Blue',
          hex: '#00008B',
          sizes: [
            { size: 30, stock: 15 },
            { size: 32, stock: 25 },
            { size: 34, stock: 18 }
          ]
        }
      ]
    }
  ]
})

// Test 4: 4-level nesting (products → colors → sizes → warehouses)
testRoundTrip('4-level nesting (products → colors → sizes → warehouses)', {
  products: [
    {
      id: 1,
      name: 'T-Shirt',
      price: 29.99,
      colors: [
        {
          name: 'Red',
          hex: '#FF0000',
          sizes: [
            {
              size: 'M',
              sku: 'TS-R-M',
              warehouses: [
                { name: 'NYC', address: '123 Main St', qty: 15 },
                { name: 'LA', address: '456 Oak Ave', qty: 20 }
              ]
            }
          ]
        }
      ]
    }
  ]
})

// Test 5: Multiple items at each level
testRoundTrip('Multiple items at all levels', {
  products: [
    {
      id: 1,
      name: 'Product A',
      colors: [
        {
          name: 'Color 1',
          sizes: [
            { size: 'S', stock: 10 },
            { size: 'M', stock: 20 }
          ]
        },
        {
          name: 'Color 2',
          sizes: [
            { size: 'L', stock: 30 }
          ]
        }
      ]
    },
    {
      id: 2,
      name: 'Product B',
      colors: [
        {
          name: 'Color 3',
          sizes: [
            { size: 'XL', stock: 40 }
          ]
        }
      ]
    }
  ]
})

// Test 6: Different data types
testRoundTrip('Various data types', {
  items: [
    {
      id: 1,
      name: 'Test',
      active: true,
      price: 99.99,
      count: 42,
      notes: ''
    },
    {
      id: 2,
      name: 'Another',
      active: false,
      price: 0,
      count: 0,
      notes: 'Has notes'
    }
  ]
})

console.log('='.repeat(60))
console.log(`\nResults: ${passedTests}/${totalTests} tests passed`)

if (passedTests === totalTests) {
  console.log('\n🎉 All round-trip tests PASSED!')
  console.log('✅ Parse function is fully functional!')
} else {
  console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed`)
  process.exit(1)
}
