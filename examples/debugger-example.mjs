import { Console } from 'promptflow';

const debuggerConsole = new Console({
    input: process.stdin,
    output: process.stdout
}, '(debugger) ');

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