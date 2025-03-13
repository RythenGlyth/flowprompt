const { Console } = require('flowprompt');

const vm = new Console({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[31m<flowprompt> \x1b[34m',
    afterInput: '\x1b[0m',
});


vm.on("line", (line) => {
    receiveStatus(0, line);
})

function receiveStatus(counter, text) {
    counter++;

    const log_start = `Calculating... [`
    const log_end = `] ${counter}/100 %`

    if(counter < 100) {
        setTimeout(() => {
            const progressWidth = (process.stdout.columns - log_start.length - log_end.length);
            const progressCount = Math.floor(counter / 100 * progressWidth);
            vm.log("\x1b[0K\x1b[1G" + log_start + "+".repeat(progressCount) + "-".repeat(progressWidth - progressCount) + log_end, false);
            receiveStatus(counter, text);
        }, Math.random() * 50)
    } else {
        vm.log("\x1b[0K\x1b[1G" + log_start + "=".repeat(process.stdout.columns - log_start.length - log_end.length) + log_end);
        vm.log(`Received: ${text}`);
    }
}