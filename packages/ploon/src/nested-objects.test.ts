/**
 * Tests for nested object support in PLOON
 */

import { parse, stringify, PLOON_COMPACT } from './index.js'

describe('Nested Objects', () => {
  describe('Basic nested object encoding and decoding', () => {
    it('should encode and decode a simple nested object', () => {
      const data = {
        users: [
          {
            id: 1,
            name: 'Alice',
            profile: {
              age: 30,
              city: 'New York'
            }
          }
        ]
      }

      const ploon = stringify(data)
      expect(ploon).toContain('[users#1](id,name,profile{age,city})')
      expect(ploon).toContain('1:1|1|Alice')
      expect(ploon).toContain('2 |30|New York')

      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })

    it('should encode and decode deeply nested objects', () => {
      const data = {
        companies: [
          {
            id: 1,
            name: 'ACME Corp',
            headquarters: {
              address: {
                street: '123 Main St',
                city: 'New York',
                country: {
                  code: 'US',
                  name: 'United States'
                }
              }
            }
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })

    it('should handle multiple objects at the same depth', () => {
      const data = {
        orders: [
          {
            id: 1,
            customer: {
              id: 'C1',
              name: 'Alice'
            },
            date: '2024-01-15'
          },
          {
            id: 2,
            customer: {
              id: 'C2',
              name: 'Bob'
            },
            date: '2024-01-16'
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })
  })

  describe('Mixed nested objects and arrays', () => {
    it('should handle object with nested array', () => {
      const data = {
        orders: [
          {
            id: 1001,
            customer: {
              id: 'CUST-001',
              name: 'Alice Johnson',
              address: {
                street: '123 Main St',
                city: 'New York'
              }
            },
            items: [
              {
                productId: 1,
                productName: 'Shirt',
                quantity: 2
              },
              {
                productId: 2,
                productName: 'Pants',
                quantity: 1
              }
            ]
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })

    it('should handle array nested inside object', () => {
      const data = {
        users: [
          {
            id: 1,
            name: 'Alice',
            profile: {
              age: 30,
              hobbies: [
                { name: 'reading', hours: 10 },
                { name: 'coding', hours: 20 }
              ]
            }
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })

    it('should handle complex mixed hierarchy', () => {
      const data = {
        organizations: [
          {
            id: 1,
            name: 'Tech Corp',
            departments: [
              {
                name: 'Engineering',
                manager: {
                  id: 'M1',
                  name: 'Alice',
                  contact: {
                    email: 'alice@example.com',
                    phone: '555-1234'
                  }
                },
                employees: [
                  { id: 'E1', name: 'Bob' },
                  { id: 'E2', name: 'Charlie' }
                ]
              }
            ]
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty nested objects', () => {
      const data = {
        users: [
          {
            id: 1,
            name: 'Alice',
            profile: {}
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon) as any
      expect(decoded?.users?.[0]?.profile).toEqual({})
    })

    it('should handle null values in nested objects', () => {
      const data = {
        users: [
          {
            id: 1,
            name: 'Alice',
            profile: {
              age: null,
              city: 'New York'
            }
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })

    it('should handle boolean values in nested objects', () => {
      const data = {
        users: [
          {
            id: 1,
            name: 'Alice',
            settings: {
              notifications: true,
              darkMode: false
            }
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })

    it('should handle numeric values including floats in nested objects', () => {
      const data = {
        products: [
          {
            id: 1,
            name: 'Widget',
            pricing: {
              cost: 10.99,
              markup: 1.5,
              retail: 16.49
            }
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })
  })

  describe('Path notation', () => {
    it('should use "depth " notation for objects', () => {
      const data = {
        orders: [
          {
            id: 1,
            customer: {
              id: 'C1',
              name: 'Alice'
            }
          }
        ]
      }

      const ploon = stringify(data)
      const lines = ploon.split('\n')

      // Find the object record line
      const objectLine = lines.find(line => line.startsWith('2 |'))
      expect(objectLine).toBeDefined()
      expect(objectLine).toMatch(/^2 \|/)
    })

    it('should use "depth:index" notation for arrays', () => {
      const data = {
        orders: [
          { id: 1 },
          { id: 2 }
        ]
      }

      const ploon = stringify(data)
      const lines = ploon.split('\n')

      // Find array element lines
      const arrayLine1 = lines.find(line => line.startsWith('1:1|'))
      const arrayLine2 = lines.find(line => line.startsWith('1:2|'))
      expect(arrayLine1).toBeDefined()
      expect(arrayLine2).toBeDefined()
    })
  })

  describe('Schema notation', () => {
    it('should use {} notation for nested objects', () => {
      const data = {
        users: [
          {
            id: 1,
            profile: {
              age: 30
            }
          }
        ]
      }

      const ploon = stringify(data)
      expect(ploon).toContain('profile{age}')
    })

    it('should use #() notation for nested arrays', () => {
      const data = {
        orders: [
          {
            id: 1,
            items: [
              { name: 'Shirt' }
            ]
          }
        ]
      }

      const ploon = stringify(data)
      expect(ploon).toContain('items#(name)')
    })

    it('should handle mixed notation in same schema', () => {
      const data = {
        orders: [
          {
            id: 1,
            customer: {
              name: 'Alice'
            },
            items: [
              { name: 'Shirt' }
            ]
          }
        ]
      }

      const ploon = stringify(data)
      expect(ploon).toContain('customer{name}')
      expect(ploon).toContain('items#(name)')
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle e-commerce order structure', () => {
      const data = {
        orders: [
          {
            id: 1001,
            date: '2024-01-15',
            total: 159.97,
            customer: {
              id: 'CUST-001',
              name: 'Alice Johnson',
              email: 'alice@example.com',
              address: {
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zip: 10001
              }
            },
            items: [
              {
                productId: 1,
                productName: 'Shirt',
                quantity: 2,
                price: 29.99
              },
              {
                productId: 2,
                productName: 'Pants',
                quantity: 2,
                price: 49.99
              }
            ]
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })

    it('should handle organization hierarchy', () => {
      const data = {
        companies: [
          {
            id: 1,
            name: 'Tech Corp',
            ceo: {
              name: 'Alice Johnson',
              email: 'alice@techcorp.com',
              assistant: {
                name: 'Bob Smith',
                email: 'bob@techcorp.com'
              }
            },
            locations: [
              {
                city: 'New York',
                address: {
                  street: '123 Main St',
                  zip: 10001
                }
              },
              {
                city: 'Los Angeles',
                address: {
                  street: '456 Oak Ave',
                  zip: 90001
                }
              }
            ]
          }
        ]
      }

      const ploon = stringify(data)
      const decoded = parse(ploon)
      expect(decoded).toEqual(data)
    })
  })

  describe('Compact format with nested objects', () => {
    it('should support compact format with nested objects', () => {
      const data = {
        users: [
          {
            id: 1,
            profile: {
              age: 30,
              city: 'New York'
            }
          }
        ]
      }

      const ploon = stringify(data, { format: 'compact' })
      expect(ploon).toContain(';')
      expect(ploon).not.toContain('\n\n')

      const decoded = parse(ploon, { config: PLOON_COMPACT })
      expect(decoded).toEqual(data)
    })
  })
})
