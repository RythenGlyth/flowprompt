const { Console } = require('flowprompt');
const { Readable } = require('stream');


const vm = new Console({
    input: process.stdin,
    output: process.stdout,
});

fetch('https://raw.githubusercontent.com/RythenGlyth/flowprompt/refs/heads/master/README.md').then(async res => {
    Readable.fromWeb(res.body).pipe(vm);
})