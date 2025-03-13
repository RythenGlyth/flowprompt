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