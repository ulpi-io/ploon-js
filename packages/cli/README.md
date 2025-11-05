# 🚀 PLOON CLI

**Command-line tool for converting data to PLOON format**

PLOON achieves **49.1% token reduction vs JSON** and **14.1% better than TOON** - perfect for optimizing LLM prompts.

[![npm version](https://img.shields.io/npm/v/ploon-cli.svg)](https://www.npmjs.com/package/ploon-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📦 Installation

```bash
# Install globally
npm install -g ploon-cli

# Or use with npx (no install)
npx ploon-cli data.json
```

---

## 🚀 Quick Start

```bash
# Convert JSON to PLOON
ploon data.json

# Save to file
ploon data.json -o output.ploon

# Minify for maximum token efficiency
ploon data.json --minify -o output.min.ploon

# Show token statistics
ploon data.json --stats
```

---

## 💻 Usage

### Basic Conversion

```bash
# JSON → PLOON (auto-detect format)
ploon data.json

# Explicit input format
ploon --from=json data.json
ploon --from=xml data.xml
ploon --from=yaml data.yaml
```

### Output Options

```bash
# Write to file
ploon data.json -o output.ploon

# Minify (token-optimized)
ploon data.json --minify

# Prettify (human-readable)
ploon data.min.ploon --prettify
```

### Convert PLOON Back

```bash
# PLOON → JSON
ploon --to=json data.ploon

# PLOON → XML
ploon --to=xml data.ploon -o output.xml

# PLOON → YAML
ploon --to=yaml data.ploon -o output.yaml
```

### Analysis & Validation

```bash
# Show token statistics
ploon data.json --stats

# Validate PLOON format
ploon data.ploon --validate
```

### Custom Configuration

```bash
# Custom delimiters
ploon data.json --field-delimiter="," --path-separator="/"

# Use config file
ploon data.json --config=custom.json
```

---

## 📋 Command Reference

### Options

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
-h, --help                  Display help
-v, --version               Display version
```

---

## 📊 Example Output

**Input (data.json):**
```json
{
  "products": [
    { "id": 1, "name": "Laptop", "price": 999 },
    { "id": 2, "name": "Mouse", "price": 25 }
  ]
}
```

**Command:**
```bash
ploon data.json --stats
```

**Output:**
```
[products#2](id,name,price)

1:1|1|Laptop|999
1:2|2|Mouse|25

📊 Token Statistics:
   JSON:  166 chars, 29 tokens
   PLOON: 62 chars, 17 tokens
   Savings: 62.7% characters, 41.4% tokens
```

---

## 🎯 Common Use Cases

### 1. Optimize LLM Prompts

```bash
# Convert large dataset for GPT-4
ploon company-data.json --minify -o prompt-data.ploon

# Result: 49% fewer tokens = lower costs!
```

### 2. Format Conversion Pipeline

```bash
# XML → PLOON → JSON
ploon --from=xml legacy.xml | ploon --to=json -o modern.json
```

### 3. Batch Processing

```bash
# Convert all JSON files
for file in *.json; do
  ploon "$file" --minify -o "${file%.json}.ploon"
done
```

### 4. Validation

```bash
# Check if PLOON file is valid
ploon data.ploon --validate && echo "Valid!" || echo "Invalid!"
```

---

## 📚 Format Examples

### Simple Array

**Input JSON:**
```json
{
  "users": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ]
}
```

**PLOON Output:**
```
[users#2](id,name)

1:1|1|Alice
1:2|2|Bob
```

### Nested Objects

**Input JSON:**
```json
{
  "orders": [{
    "id": 101,
    "customer": {
      "name": "Alice",
      "address": {
        "city": "NYC",
        "zip": 10001
      }
    }
  }]
}
```

**PLOON Output:**
```
[orders#1](customer{address{city,zip},name},id)

1:1|101
2 |Alice
3 |NYC|10001
```

### Nested Arrays

**Input JSON:**
```json
{
  "products": [{
    "id": 1,
    "name": "Shirt",
    "colors": [
      { "name": "Red", "hex": "#FF0000" },
      { "name": "Blue", "hex": "#0000FF" }
    ]
  }]
}
```

**PLOON Output:**
```
[products#1](colors#(hex,name),id,name)

1:1|1|Shirt
2:1|#FF0000|Red
2:2|#0000FF|Blue
```

---

## 📐 Understanding Path Notation

PLOON uses **dual path notation** to distinguish between arrays and objects:

### Array Paths: `depth:index`

Used for array elements with an index component:
- `1:1` - First item at depth 1
- `1:2` - Second item at depth 1
- `2:1` - First item at depth 2 (nested in `1:1`)
- `3:2` - Second item at depth 3

### Object Paths: `depth ` (depth + space)

Used for object elements without an index:
- `2 ` - Object at depth 2
- `3 ` - Object at depth 3
- `4 ` - Object at depth 4

### When to Use Each

**Arrays** (`#` in schema): Use `depth:index` format
```
[products#2](id,name)    ← Array marker #
1:1|1|Laptop             ← Array path
1:2|2|Mouse              ← Array path
```

**Objects** (`{}` in schema): Use `depth ` format
```
[orders#1](customer{name},id)    ← Object marker {}
1:1|101                          ← Array path (order)
2 |Alice                         ← Object path (customer)
```

**Mixed structures** combine both notations seamlessly:
```
[orders#1](customer{address{city}},items#(name,price),id)

1:1|101                  ← Order (array element)
2 |Alice                 ← Customer (object)
3 |NYC                   ← Address (nested object)
2:1|Laptop|999           ← Item 1 (array element)
2:2|Mouse|25             ← Item 2 (array element)
```

---

## 🔗 Links

- **Core Library**: [`ploon`](https://www.npmjs.com/package/ploon) - For programmatic use
- **Documentation**: [ploon.ai](https://ploon.ai)
- **Specification**: [github.com/ulpi-io/ploon-spec](https://github.com/ulpi-io/ploon-spec)
- **GitHub**: [github.com/ulpi-io/ploon-js](https://github.com/ulpi-io/ploon-js)

---

## 📝 Programmatic Usage

For Node.js/TypeScript projects, use the [`ploon`](https://www.npmjs.com/package/ploon) package:

```bash
npm install ploon
```

```typescript
import { stringify, parse, minify } from 'ploon'

const ploon = stringify({ users: [{ id: 1, name: 'Alice' }] })
const data = parse(ploon)
const compact = minify(ploon)
```

See the [ploon package](https://www.npmjs.com/package/ploon) for full API documentation.

---

## 📄 License

MIT © [Ciprian Spiridon](https://github.com/cipriancus)

---

**Made with ❤️ for LLM optimization**
