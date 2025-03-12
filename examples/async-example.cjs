const { Console } = require('promptflow');

const vm = new Console({
    input: process.stdin,
    output: process.stdout,
}, 'my-app> ', 'utf8');

setInterval(() => {
    vm.log(String.fromCodePoint(Math.floor(Math.random() * (0x5a - 0x41) + 0x41)), false);
},Math.random() * 1000)

vm.on("line", (line) => {
    vm.log(`Received: ${line}`);
})