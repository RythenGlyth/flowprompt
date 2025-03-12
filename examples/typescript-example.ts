import { Console } from 'flowprompt';

const vm = new Console({
    input: process.stdin,
    output: process.stdout,
}, '-> ', 'utf8');

vm.log('Welcome to the VM Console!', true);

vm.on('line', (line: string) => {
    vm.log(`You typed: ${line}`, true);
});
