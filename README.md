# flowprompt

[![npm version](https://img.shields.io/npm/v/flowprompt.svg)](https://www.npmjs.com/package/flowprompt)
[![npm downloads](https://img.shields.io/npm/dw/flowprompt)](https://www.npmjs.com/package/flowprompt)

A Node.js terminal interface library for building rich interactive CLI applications. It provides a persistent prompt with managed logging output above. It's like REPL interfaces but has the benefit of output and input being evaulated separately which means you can input while output is generated. It is inspired by debugger interfaces like `gdb`.

![Demo](demo.gif)

<sup>[view /examples/demo-example.js](examples/demo-example.js)</sup>

## Table of Contents

- [Key Features](#key-features)
- [Installation](#installation)
- [Examples](#examples)
  - [TypeScript Example](#typescript-example)
  - [Asynchronous Output Example](#asynchronous-output-example)
  - [Debugger-like Interface Example](#debugger-like-interface-example)
- [Contributing](#contributing)

## Key Features
1. **Persistent Prompt** - Always-visible input area with custom prompt symbol
1. **Async-safe Logging** - Write to output while waiting for user input without UI corruption
1. **Multi-line Log Control** - Continue writing to the same output line or create new lines
1. **Piping Support** - Supports piping into the output area
1. **Advanced Input Handling** - Supports most important keys and key combinations:
   - History navigation (↑/↓ keys)
   - Advanced Cursor movement (←/→/Home/End/Ctrl+←/Ctrl+→)
   - ANSI escape sequence support
   - Ctrl+C handling (with double-tap exit)
1. **TypeScript Ready** - Full type definitions included
1. **Dual Module Support** - Works with both CommonJS (`require`) and ESM (`import`)

## Installation

```sh
npm install flowprompt
```

## Examples

### TypeScript Example

```typescript
import { Console } from 'flowprompt';

const vm = new Console({
    input: process.stdin,
    output: process.stdout,
    prompt: '-> ',
    encoding: 'utf8',
});

vm.log('Welcome to the VM Console!', true);

vm.on('line', (line: string) => {
    vm.log(`You typed: ${line}`, true);
});
```

<sup>[view /examples/typescript-example.ts](examples/typescript-example.ts)</sup>

Or run it using the following command:

```sh
npx tsx examples/typescript-example.ts
```

### Asynchronous Output Example

```javascript
const { Console } = require('flowprompt');

const vm = new Console({
    input: process.stdin,
    output: process.stdout,
    prompt: 'my-app> ',
    encoding: 'utf8'
});

setInterval(() => {
    vm.log(String.fromCodePoint(Math.floor(Math.random() * (0x5a - 0x41) + 0x41)), false);
},Math.random() * 1000)

vm.on("line", (line) => {
    vm.log(`Received: ${line}`);
})
```

<sup>[view /examples/async-example.cjs](examples/async-example.cjs)</sup>

Or run it using the following command:

```sh
node examples/async-example.cjs
```

### Debugger-like Interface Example

```javascript
import { Console } from 'flowprompt';

const debuggerConsole = new Console({
    input: process.stdin,
    output: process.stdout,
    prompt: '(debugger) '
});

debuggerConsole.on('line', (cmd) => {
    switch (cmd) {
        case 'b':
        case 'breakpoints':
            debuggerConsole.log('Active breakpoints:\n- main.js:12\n- utils.js:45');
            break;
        case 'c':
        case 'continue':
            debuggerConsole.log('Resuming execution...');
            break;
        case 'h':
        case 'help':
        default:
            debuggerConsole.log('Available commands:\n- breakpoints (b)\n- continue (c)\n- help (h)');
            break;
    }
});

const completions = ['breakpoints', 'continue', 'help'];

debuggerConsole.on('autocomplete', ({line, pos, callback}) => {
    const lineEnd = line.slice(line.lastIndexOf(' ', pos - 1), pos)
    const hits = completions.filter((c) => c.startsWith(lineEnd)).map((c) => c.slice(lineEnd.length));
    const ccompletions = hits.map((hit) => ({line: `${line.slice(0, pos)}${hit}${line.slice(pos)}`, pos: pos + hit.length}))
    debuggerConsole.log(ccompletions.toString())
    callback(ccompletions);
})
```

<sup>[view /examples/debugger-example.mjs](examples/debugger-example.mjs)</sup>

Or run it using the following command:

```sh
node examples/debugger-example.mjs
```

## Contributing

Contributions are welcome! Create a pull request or open an issue to discuss a feature request or bug report. Have a look at [TODO.md](TODO.md) for planned features and improvements if you want to help out.