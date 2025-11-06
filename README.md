# 🚀 PLOON: Path-Level Object Oriented Notation

**The Most Token-Efficient Format for Nested Hierarchical Data**

PLOON achieves **49% token reduction vs JSON** and **14% better than TOON** through dual path notation (depth:index for arrays, depth for objects) and single schema declaration, with full support for nested objects and arrays in any combination.

**Inspired by [TOON Format](https://github.com/jpolvora/toon)**. PLOON offers an alternative approach using path-based hierarchy instead of indentation, achieving comparable token efficiency while solving most of TOON's tradeoffs.

[![npm version](https://img.shields.io/npm/v/ploon.svg)](https://www.npmjs.com/package/ploon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📊 Why PLOON?

When sending data to LLMs, every token counts. PLOON optimizes hierarchical data by:

- **Path-based hierarchy**: Eliminates nesting overhead (no indentation!)
- **Dual path notation**: depth:index for arrays, depth for objects
- **Single schema declaration**: Zero key repetition
- **Dual format strategy**: Human-readable + machine-optimized

### Key Findings

| Metric | vs JSON | vs XML | vs YAML | vs TOON |
|--------|---------|--------|---------|---------|
| **File Size (Standard)** | 66.2% ↓ | 62.4% ↓ | 48.5% ↓ | **36.0% ↓** |
| **File Size (Minified)** | 66.5% ↓ | 62.8% ↓ | 49.0% ↓ | **36.5% ↓** |
| **Token Count (Standard)** | 49.1% ↓ | 48.7% ↓ | 24.8% ↓ | **14.1% ↓** |
| **Token Count (Minified)** | 49.1% ↓ | 48.7% ↓ | 24.8% ↓ | **14.1% ↓** |
| **Round-Trip Accuracy** | - | - | - | **91.7%** (11/12) |

**PLOON beats TOON on BOTH metrics:**
- 36.0% smaller file size (36.5% minified)
- 14.1% fewer tokens with depth:index format + nested object support

### Cost Savings (GPT-5 @ $1.25/1M tokens)

- **Average savings:** $616.25 per 1M API calls vs JSON

**ROI Example (10M API calls/month):**
- With JSON: $18,707.48/month
- With PLOON: $12,544.98/month
- **Monthly Savings: $6,162.50** (32.9% reduction)

---

## 🎯 Features

✅ **Nested objects support**: Arrays `#()` and Objects `{}` notation
✅ **Multi-format input**: JSON, XML, YAML → PLOON
✅ **Dual output**: Standard (readable) or Compact (efficient)
✅ **Fully configurable**: Custom delimiters, separators, markers
✅ **Zero dependencies**: Native JSON parsing
✅ **TypeScript**: Full type safety
✅ **Tree-shakeable**: Import only what you need
✅ **CLI tool**: Convert files from command line

---

## 📦 Installation

```bash
# Core library
npm install ploon
# or
pnpm add ploon
# or
yarn add ploon

# CLI tool (optional)
npm install -g ploon-cli
```

---

## 🚀 Quick Start

```typescript
import { stringify, minify, fromJSON } from 'ploon'

// Your data
const data = {
  products: [
    { id: 1, name: 'Shirt', price: 29.99 },
    { id: 2, name: 'Pants', price: 49.99 }
  ]
}

// Convert to PLOON Standard (human-readable)
const ploon = stringify(data)
console.log(ploon)
// [products#2](id,name,price)
//
// 1:1|1|Shirt|29.99
// 1:2|2|Pants|49.99

// Minify for production (token-optimized)
const compact = minify(ploon)
console.log(compact)
// [products#2](id,name,price);;1:1|1|Shirt|29.99;1:2|2|Pants|49.99

// 62.7% smaller than JSON! 🎉
```

---

## 📖 API Reference

### Core Functions

#### `stringify(data, options?)`

Convert JavaScript object to PLOON string.

```typescript
import { stringify } from 'ploon'

const ploon = stringify(data, {
  format: 'standard',  // or 'compact'
  config: {
    fieldDelimiter: '|',
    pathSeparator: ':',
    // ... other options
  }
})
```

#### `parse(ploonString, options?)`

Convert PLOON string to JavaScript object.

```typescript
import { parse } from 'ploon'

const data = parse(ploonString, {
  strict: true,  // Validate schema
  config: { /* custom config */ }
})
```

#### `minify(ploonString)`

Convert Standard format → Compact format (newlines → semicolons).

```typescript
import { minify } from 'ploon'

const compact = minify(standardPloon)
// Reduces tokens further!
```

#### `prettify(ploonString)`

Convert Compact format → Standard format (semicolons → newlines).

```typescript
import { prettify } from 'ploon'

const readable = prettify(compactPloon)
// Makes debugging easier!
```

### Input Parsers

#### `fromJSON(jsonString)`

Parse JSON string to object (uses native `JSON.parse`).

```typescript
import { fromJSON, stringify } from 'ploon'

const obj = fromJSON('{"name": "John"}')
const ploon = stringify(obj)
```

#### `fromXML(xmlString)`

Parse XML string to object (uses `fast-xml-parser`).

```typescript
import { fromXML, stringify } from 'ploon'

const obj = fromXML('<root><name>John</name></root>')
const ploon = stringify(obj)
```

#### `fromYAML(yamlString)`

Parse YAML string to object (uses `yaml`).

```typescript
import { fromYAML, stringify } from 'ploon'

const obj = fromYAML('name: John\nage: 30')
const ploon = stringify(obj)
```

### Validation

#### `isValid(ploonString)`

Check if a string is valid PLOON format.

```typescript
import { isValid } from 'ploon'

if (isValid(input)) {
  console.log('Valid PLOON!')
}
```

#### `validate(ploonString)`

Get detailed validation results.

```typescript
import { validate } from 'ploon'

const result = validate(input)
// { valid: boolean, errors?: string[], warnings?: string[] }
```

---

## ⚠️ Type Preservation & Limitations

PLOON prioritizes token efficiency over perfect type preservation. Understanding these trade-offs helps you use PLOON effectively:

### Automatic Type Conversion

PLOON automatically converts string values to their native types during parsing:

```typescript
// These all parse to the same value
"1"      → 1      (number)
"true"   → true   (boolean)
"false"  → false  (boolean)
"null"   → null   (null)
```

**Why?** This reduces token count by eliminating quotes, saving ~2 tokens per value.

### Null Handling in Arrays

Arrays containing `null` values convert nulls to empty strings:

```typescript
const data = {
  items: [{ values: ['a', null, 'c'] }]
}

// After round-trip:
// With preserveEmptyFields: true  → ['a', '', 'c']
// With preserveEmptyFields: false → ['a', 'c']
```

**Why?** Null values in arrays are often noise. The `preserveEmptyFields` flag lets you control this behavior.

### Acceptable Trade-offs

✅ **No impact on semantics:**
- `"1"` vs `1` - both represent the value 1
- `"true"` vs `true` - both represent boolean true
- `null` in arrays → removed or empty string (position doesn't matter semantically)

❌ **May affect round-trip if you need:**
- Exact string preservation (e.g., `"1"` must stay a string)
- Null positions in arrays to be preserved exactly
- Perfect type fidelity for all edge cases

### When PLOON is Perfect

✅ **Structured data** (APIs, databases, LLM responses)
✅ **E-commerce** (products, orders, customers)
✅ **Analytics** (metrics, events, logs)
✅ **Configuration** (settings, preferences)

### When to Use JSON Instead

⚠️ **Exact type preservation required** (scientific data, financial precision)
⚠️ **Schema-less data** (unknown structure)
⚠️ **Human editing** (config files users modify directly)

**Bottom Line:** PLOON achieves 49% token reduction by making smart assumptions about data. For 90%+ of LLM use cases, these trade-offs are invisible and save significant costs.

---

## 🎨 Examples

### Simple Data

```typescript
const data = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ]
}

const ploon = stringify(data)
// [users#2](email,id,name)
//
// 1:1|alice@example.com|1|Alice
// 1:2|bob@example.com|2|Bob
```

### Nested Arrays (3 Levels)

```typescript
const data = {
  products: [
    {
      id: 1,
      name: 'T-Shirt',
      colors: [
        {
          name: 'Red',
          sizes: [
            { size: 'S', stock: 50 },
            { size: 'M', stock: 30 }
          ]
        }
      ]
    }
  ]
}

const ploon = stringify(data)
// [products#1](colors#(name,sizes#(size,stock)),id,name)
//
// 1:1|1|T-Shirt
// 2:1|Red
// 3:1|S|50
// 3:2|M|30
```

### Nested Objects

```typescript
const data = {
  orders: [
    {
      id: 1001,
      date: '2024-01-15',
      customer: {
        id: 'CUST-001',
        name: 'Alice Johnson',
        address: {
          street: '123 Main St',
          city: 'New York',
          zip: 10001
        }
      },
      items: [
        { id: 1, name: 'Shirt', price: 29.99 }
      ]
    }
  ]
}

const ploon = stringify(data)
// [orders#1](customer{address{city,street,zip},id,name},date,id,items#(id,name,price))
//
// 1:1|2024-01-15|1001
// 2 |CUST-001|Alice Johnson
// 3 |New York|123 Main St|10001
// 2:1|1|Shirt|29.99
```

**Key Notation:**
- Arrays: `items#(fields)` - depth:index paths (e.g., `2:1`)
- Objects: `customer{fields}` - depth-only paths (e.g., `2 `)
- Mixed: Seamlessly combine arrays and objects in any structure

### Primitive Arrays

Arrays of primitives (strings, numbers, booleans) are encoded inline for efficiency:

```typescript
const data = {
  products: [
    {
      id: 1,
      name: 'Widget',
      tags: ['new', 'sale', 'featured'],  // Primitive array
      prices: [9.99, 8.99, 7.99]          // Primitive array
    }
  ]
}

const ploon = stringify(data)
// [products#1](id,name,prices#(),tags#())
//
// 1:1|1|Widget|9.99,8.99,7.99|new,sale,featured

// Notice: Primitive arrays are comma-separated inline! 🎯
```

### Handling Special Characters in Arrays

Values containing commas are automatically escaped:

```typescript
const data = {
  items: [
    {
      coordinates: ['40.7128,74.0060', '34.0522,118.2437'],  // Commas in values
      descriptions: ['Hello, world', 'Goodbye, friend']
    }
  ]
}

const ploon = stringify(data)
// [items#1](coordinates#(),descriptions#())
//
// 1:1|40.7128\,74.0060,34.0522\,118.2437|Hello\, world,Goodbye\, friend

// Commas are escaped with backslash: \,
```

### preserveEmptyFields Configuration

Control how null and empty values are handled in arrays:

```typescript
const data = {
  items: [
    {
      values: ['a', null, 'b', '', 'c'],
      metadata: null  // Object field (always preserved)
    }
  ]
}

// Default behavior (preserveEmptyFields: true)
const ploonDefault = stringify(data)
// [items#1](metadata,values#())
//
// 1:1|null|a,,b,,c
// After parse: { values: ['a', '', 'b', '', 'c'], metadata: null }
// Nulls → empty strings, kept in arrays

// Clean mode (preserveEmptyFields: false) - Recommended for LLMs
const ploonClean = stringify(data, {
  config: { preserveEmptyFields: false }
})
// [items#1](metadata,values#())
//
// 1:1|null|a,b,c
// After parse: { values: ['a', 'b', 'c'], metadata: null }
// Nulls and empties removed from arrays, object fields preserved

// 🎯 preserveEmptyFields: false saves tokens and cleans data!
```

**Key Differences:**
- **Object fields** (like `metadata: null`): Always preserved as `null`
- **Array elements** (like `null` in values array):
  - `true`: Convert to empty string, keep in array
  - `false`: Remove from array entirely (default for production)

### Custom Configuration

```typescript
// CSV-style (comma delimiter, custom path separator)
const csvStyle = stringify(data, {
  config: {
    fieldDelimiter: ',',
    pathSeparator: ':'  // Can still use : or customize
  }
})
// [products#2](id,name,price)
//
// 1:1,1,Shirt,29.99
// 1:2,2,Pants,49.99
```

---

## 💻 CLI Usage

```bash
# Convert JSON to PLOON
ploon data.json

# Convert to compact format
ploon data.json --minify
ploon data.json --minify -o output.ploon

# Explicit input format
ploon --from=xml data.xml
ploon --from=yaml data.yaml

# Convert PLOON to JSON
ploon --to=json data.ploon

# Convert PLOON to XML
ploon --to=xml data.ploon -o output.xml

# Format conversion
ploon data.ploon --minify        # Standard → Compact
ploon data.ploon --prettify      # Compact → Standard

# Validation
ploon data.ploon --validate

# Show statistics
ploon data.json --stats

# Custom delimiters
ploon data.json --field-delimiter="," --path-separator="/"

# Config file
ploon data.json --config=custom.json
```

### CLI Options

```
-o, --output <file>         Output file (default: stdout)
--from <format>             Input format: json|xml|yaml (default: auto)
--to <format>               Output format: json|xml|yaml (from PLOON)
--minify                    Output compact format
--prettify                  Output standard format
--validate                  Validate PLOON format
--stats                     Show token comparison
-c, --config <file>         Custom configuration file
--field-delimiter <char>    Field delimiter (default: |)
--path-separator <char>     Path separator (default: :)
--array-marker <char>       Array size marker (default: #)
```

---

## ⚙️ Configuration

### Default Configuration

```typescript
{
  fieldDelimiter: '|',         // Separates values
  pathSeparator: ':',          // Separates depth:index (e.g., 5:1)
  arraySizeMarker: '#',        // Array length marker
  recordSeparator: '\n',       // Newline (standard) or ';' (compact)
  escapeChar: '\\',            // Escape special characters
  schemaOpen: '[',             // Schema opening bracket
  schemaClose: ']',            // Schema closing bracket
  fieldsOpen: '(',             // Fields opening paren
  fieldsClose: ')',            // Fields closing paren
  nestedSeparator: '|',        // Nested schema separator
  preserveEmptyFields: true    // Keep null/empty in arrays (false = remove for cleaner data)
}
```

### Presets

```typescript
import { PLOON_STANDARD, PLOON_COMPACT } from 'ploon'

// Standard: newline-separated (human-readable)
stringify(data, { config: PLOON_STANDARD })

// Compact: semicolon-separated (token-optimized)
stringify(data, { config: PLOON_COMPACT })
```

---

## 📐 Format Specification

### Standard Format

```
[root#count](field1,field2,nested#(subfield1),object{objfield1,objfield2})

1:1|value1|value2
2:1|subvalue1
2 |objvalue1|objvalue2
```

### Compact Format

```
[root#count](field1,field2,nested#(subfield1),object{objfield1});1:1|val1|val2;2:1|sub1;2 |obj1
```

### Path Notation

**Arrays** use `depth:index` format:
- `1:1` - First item at depth 1
- `2:1` - First child (depth 2) of item 1:1
- `3:1` - First grandchild (depth 3)
- `5:4` - Fourth item at depth 5

**Objects** use `depth ` format (depth + space):
- `2 ` - Object at depth 2
- `3 ` - Nested object at depth 3
- `4 ` - Deeply nested object at depth 4

**Schema Notation:**
- Arrays of objects: `fieldName#(nestedFields)` - e.g., `items#(id,name,price)`
- Primitive arrays: `fieldName#()` - e.g., `tags#()`, `prices#()`
- Objects: `fieldName{nestedFields}` - e.g., `customer{id,name}`
- Both can nest infinitely: `address{city,country{code,name}}`

**Primitive Arrays:**
- Arrays like `['a', 'b', 'c']` or `[1, 2, 3]` are encoded inline as comma-separated values
- Schema: `tags#()` (empty parens indicate primitive array)
- Data: `tag1,tag2,tag3` (inline, no child records)

### Escaping

Special characters are escaped with backslash `\`:
- `\|` - Literal pipe (field delimiter)
- `\,` - Literal comma (in primitive arrays)
- `\;` - Literal semicolon (record separator in compact mode)
- `\\` - Literal backslash (escape character itself)

**Example:**
```typescript
// Value with special characters: "Hello, world | test"
// Encoded as: Hello\, world \| test
```

---

## 📊 Benchmarks

### Latest Benchmark Results (2025-11-05)

**Size Reduction:**
- vs JSON: **66.2%** reduction
- vs XML: **62.4%** reduction
- vs YAML: **48.5%** reduction
- vs TOON: **36.0%** reduction

**Token Reduction (GPT-5):**
- vs JSON: **49.1%** fewer tokens
- vs XML: **48.7%** fewer tokens
- vs YAML: **24.8%** fewer tokens
- vs TOON: **14.1%** fewer tokens

**Cost Savings (GPT-5 @ $1.25/1M tokens):**
- Average per 1M calls: **$616.25 saved** vs JSON
- ROI Example (10M calls/month):
  - JSON: $18,707/month
  - PLOON: $12,545/month
  - **Savings: $6,162/month** ($73,950/year!)

**Round-Trip Accuracy:** 91.7% (11/12 datasets)
- One dataset (Algolia) has known type preservation edge cases (string "1" → number 1)
- All other datasets achieve perfect round-trip fidelity

### Real-World Examples

| Dataset | JSON | PLOON | Savings |
|---------|------|-------|---------|
| Companies (nested objects) | 2,609 chars | 857 chars | **67.2%** |
| E-commerce | 13,412 chars | 3,198 chars | **76.2%** |
| Orders (mixed) | 1,674 chars | 513 chars | **69.4%** |
| Products | 1,367 chars | 377 chars | **72.4%** |

### PLOON vs TOON

Both formats achieve similar token efficiency (40-50% vs JSON), with different strengths:

**PLOON Advantages:**
- ✅ Explicit path relationships (depth:index format)
- ✅ Better for deep nesting (constant token cost per path)
- ✅ Path-based queries (easier filtering)
- ✅ No indentation parsing needed

**TOON Advantages:**
- ✅ More human-readable (visual hierarchy)
- ✅ Simpler for shallow structures
- ✅ Established format with broader adoption

**Choose PLOON when:** You have deep nesting (3+ levels), need path-based queries, or want explicit relationships.

**Choose TOON when:** You prioritize human readability and have shallow structures.

---

## 🧪 Examples Directory

Check out `/examples` for more:

- `basic-usage.js` - Simple conversion
- `nested-data.js` - Deep nesting (3+ levels)
- `multi-format.js` - JSON, XML, YAML input
- `custom-config.js` - Custom delimiters

Run them:
```bash
node examples/basic-usage.js
node examples/nested-data.js
```

---

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

---

## 📝 TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  PloonConfig,
  StringifyOptions,
  ParseOptions,
  ValidationResult,
  JsonValue,
  JsonObject,
  JsonArray
} from 'ploon'
```

---

## 🤝 Contributing

Contributions welcome! Please check our [Contributing Guide](CONTRIBUTING.md).

---

## 📄 License

MIT © [Ciprian Spiridon](https://github.com/cipriancus)

---

## 🔗 Links

- [Website](https://ploon.ai)
- [Specification](https://github.com/ulpi-io/ploon-spec)
- [npm Package](https://www.npmjs.com/package/ploon)
- [GitHub](https://github.com/ulpi-io/ploon-js)
- [TOON Format](https://github.com/toon-format/toon) (Inspiration)

---

## 🎉 Credits

Inspired by [TOON Format](https://github.com/toon-format/toon). PLOON offers an alternative approach using path-based hierarchy instead of indentation, achieving comparable token efficiency with different trade-offs.

---

**Made with ❤️ for LLM optimization**
