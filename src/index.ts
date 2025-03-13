import { EventEmitter } from 'events';
import { StringDecoder } from 'string_decoder';

const CONTROL_CHAR_REGEX = /\p{General_Category=Control}/ug;

class Console extends EventEmitter {
    input: NodeJS.ReadStream;
    output: NodeJS.WriteStream;
    prompt: string;
    afterInput: string;
    promptlength: number;

    inBuffer: string[];
    inPos: number;
    pressedControlC: boolean;
    logPos: {
        hadNewline: boolean;
        x: number;
    };
    history: string[][];
    historyIndex: number;

    decoder: StringDecoder;
    escapeBuffer: string[];

    constructor({
        input,
        output,
        prompt='> ',
        /** afterinput is a string that will be printed after the input line to fix ansi sequences */
        afterInput='',
        encoding='utf8'
    }: {
        input: NodeJS.ReadStream,
        output: NodeJS.WriteStream,
        prompt?: string,
        afterInput?: string,
        encoding?: BufferEncoding
    }) {
        super();
        this.input = input;
        this.output = output;
        this.prompt = prompt
        this.afterInput = afterInput;

        this.promptlength = this.prompt.replace(/\x1b((\[.*?[\x40-\x7E])|.)/g, '').replace(CONTROL_CHAR_REGEX, '').length;

        this.inBuffer = [];
        this.inPos = 0;
        this.pressedControlC = false;
        this.logPos = {
            hadNewline: true,
            x: 1,
        }
        this.history = [];
        this.historyIndex = -1;

        this.decoder = new StringDecoder(encoding);
        this.escapeBuffer = [];

        this.init()
    }

    private init() {
        this.input.setRawMode(true);
        this.input.on('data', this.inputHandler.bind(this));
        this.input.resume();
        this.redisplay();
    }

    private inputHandler(data: string) {
        this.input.pause();
        try {
            const str = this.decoder.write(data);
            this.processString(str);
        } finally {
            this.input.resume();
        }
    }

    private processString(str: string) {
        for (const char of str) {
            if (this.escapeBuffer.length > 0) {
                if(this.processEscapeSeqChar(char)) {
                    continue;
                }
            }
            this.processNormalChar(char);
        }   
    }

    private processEscapeSeqChar(char: string) {
        //any escape sequence
        if(this.escapeBuffer.length === 1 && this.escapeBuffer[0] === '\x1B') {
            if(char == '[') {
                this.escapeBuffer.push(char);
                return true;
            } else {
                this.processCompleteEscapeSeq([...this.escapeBuffer, char]);
                this.escapeBuffer = [];
                return true;
            }
        }
        //CSI escape sequence
        if(this.escapeBuffer[0] !== '\x1B' && this.escapeBuffer[1] !== '[') {
            this.processCompleteEscapeSeq(this.escapeBuffer);
            this.escapeBuffer = [];
            return false;
        }

        const thisCode = char.codePointAt(0) || 0;
        if(thisCode >= 0x40 && thisCode <= 0x7E) { // Final byte of escape sequence
            this.processCompleteEscapeSeq([...this.escapeBuffer, char]);
            this.escapeBuffer = [];
            return true;
        }

        if(this.escapeBuffer.length === 2) {
            if(thisCode >= 0x30 && thisCode <= 0x3F // Parameter byte
                || thisCode >= 0x20 && thisCode <= 0x2F) { // Intermediate byte
                this.escapeBuffer.push(char);
                return true;
            } else {
                this.processCompleteEscapeSeq(this.escapeBuffer);
                this.escapeBuffer = [];
                return false;
            }
        }
        const lastCode = this.escapeBuffer[this.escapeBuffer.length - 1].codePointAt(0) || 0;
        if(lastCode >= 0x30 && lastCode <= 0x3F) { // Parameter byte
            if((thisCode >= 0x30 && thisCode <= 0x3F) || (thisCode >= 0x20 && thisCode <= 0x2F)) { // Parameter byte or Intermediate byte
                this.escapeBuffer.push(char);
                return true;
            }
        }
        if(lastCode >= 0x20 && lastCode <= 0x2F) { // Intermediate byte
            if(thisCode >= 0x20 && thisCode <= 0x2F) { // Intermediate byte
                this.escapeBuffer.push(char);
                return true;
            }
        }
        this.processCompleteEscapeSeq(this.escapeBuffer);
        this.escapeBuffer = [];
        return false;
    }

    private processCompleteEscapeSeq(seq: string[]) {
        if(seq[0] !== '\x1B' || seq[1] !== '[') {
            this.log(`Unknown escape sequence: ${seq.join('')}`);
            return;
        }
        // split seq into seq[seq.length - 1] (final byte) and split seq.slice(2, -1) into bytes 0x30-0x3F (parameter bytes) and 0x20-0x2F (intermediate bytes)
        const finalByte = seq[seq.length - 1];
        const param_bytes: string[] = [];
        //const interm_bytes = [];
        for(let i = 2; i < seq.length - 1; i++) {
            const code = seq[i].codePointAt(0) || 0;
            if(code >= 0x30 && code <= 0x3F) {
                param_bytes.push(seq[i]);
            }/* else if(code >= 0x20 && code <= 0x2F) {
                interm_bytes.push(seq[i]);
            }*/
        }
        const param_str = param_bytes.join('');
        //const interm_str = interm_bytes.join('');

        switch(finalByte) {
            case 'A': // Cursor up
                let paramsUp = param_str.split(';').map(x => parseInt(x) || 1);
                if(this.historyIndex === -1) {
                    this.history[-1] = this.inBuffer;
                }
                this.historyIndex = Math.min(this.history.length - 1, this.historyIndex + paramsUp[0]);
                this.inBuffer = [...(this.history[this.historyIndex] || [])];
                this.inPos = this.inBuffer.length;
                this.redisplay();
                return;
            case 'B': // Cursor down
                let paramsDn = param_str.split(';').map(x => parseInt(x) || 1); // ignore second parameter (modifier)
                this.historyIndex = Math.max(-1, this.historyIndex - paramsDn[0]);
                this.inBuffer = [...(this.history[this.historyIndex] || [])];
                this.inPos = this.inBuffer.length;
                this.redisplay();
                return;
            case 'C': // Cursor right
                let paramsRi = param_str.split(';').map(x => parseInt(x) || 1);
                let ctrlEnRi = paramsRi[1] === 5 || paramsRi[1] === 6;
                let newPosRi = this.inPos + paramsRi[0];
                if(ctrlEnRi) {
                    let newWordPos = this.inBuffer.slice(newPosRi).findIndex(x => (paramsRi[1] === 6 ? /\s/ : /[^\w]/).test(x));
                    if(newWordPos === -1) {
                        newPosRi = this.inBuffer.length;
                    } else {
                        newPosRi += newWordPos;
                    }
                }
                this.inPos = Math.min(this.inBuffer.length, newPosRi);
                this.repositionCursor();
                return;
            case 'D': // Cursor left
                let paramsLe = param_str.split(';').map(x => parseInt(x) || 1);
                let ctrlEnLe = paramsLe[1] === 5 || paramsLe[1] === 6;
                let newPosLe = this.inPos - paramsLe[0];
                if(ctrlEnLe) {
                    let newWordPos = this.inBuffer.slice(0, newPosLe).reverse().findIndex(x => (paramsLe[1] === 6 ? /\s/ : /[^\w]/).test(x));
                    if(newWordPos === -1) {
                        newPosLe = 0;
                    } else {
                        newPosLe -= newWordPos;
                    }
                }
                this.inPos = Math.max(0, newPosLe);
                this.repositionCursor();
                return;
            case '~': // Final byte of key code
                if(param_str === '3') { // DEL Right key
                    this.inBuffer.splice(this.inPos, 1);
                    this.redisplay();
                    return;
                }
                break;
            case 'H': // Home key
                this.inPos = 0;
                this.repositionCursor();
                return;
            case 'F': // End key
                this.inPos = this.inBuffer.length;
                this.repositionCursor();
                return;
        }
        this.log(`Unknown escape sequence: ${seq.join('')}`);
    }

    private processNormalChar(char: string) {
        if(char != '\u0003') this.pressedControlC = false;
        switch (char) {
            case '\u0003': // Ctrl+C
                if(this.pressedControlC) {
                    process.exit(0);
                    break;
                }
                this.pressedControlC = true;
                this.log('^C');
                break;
            case '\x1B': // Escape
                this.escapeBuffer = [char];
                break;
            case '\r':
            case '\n':
                this.processSendInput();
                break;
            case '\u007F': // Backspace and Ctrl+Backspace or vice versa
            case '\x08': 
                if(this.inPos > 0) {
                    this.inBuffer.splice(this.inPos - 1, 1);
                    this.inPos--;
                    this.redisplay();
                }
                break;
            case '\t': // Tab
                //TODO: Autocomplete
                break;
            default:
                if(CONTROL_CHAR_REGEX.test(char)) {
                    this.log(`^${String.fromCharCode((char.codePointAt(0) || 0) + 0x40)}`);
                }
                this.inBuffer.splice(this.inPos, 0, char);
                this.inPos++;
                this.redisplay();
                break;
        }
    }

    private processSendInput() {
        const line: string = this.inBuffer.join('');
        this.history = [this.inBuffer.slice(), ...this.history];
        this.historyIndex = -1;
        this.inBuffer = [];
        this.inPos = 0;
        this.output.write('\n');
        this.logPos = {
            hadNewline: true,
            x: 1,
        }
        this.emit('line', line);
        this.redisplay();
    }

    public log(str: string, newline: boolean = true) {
        if(this.logPos.hadNewline) {
            this.output.write("\x1B[1G"); // Move cursor to start of line
            this.output.write("\x1B[K"); // Clear line
        } else {
            this.output.write("\x1B[1A"); // Move cursor up one line
            this.output.write(`\x1B[${this.logPos.x}G`); // Move cursor to correct position
        }
        this.output.write(str);
        this.output.write('\n');
        if(newline) {
            this.logPos.x = 1;
        } else {
            this.logPos.x += str.length;
        }

        this.logPos.hadNewline = newline;

        this.redisplay();
    }

    private redisplay() {
        const promptLine = this.prompt + this.inBuffer.join('') + this.afterInput;
        const cursorPos = this.promptlength + this.inPos + 1;

        this.output.write(
            '\x1B[0G' // Move cursor to start of line
            + "\x1B[K" // Clear line
            + '\x1B[0m' // Reset colors
            + promptLine
            + `\x1B[${cursorPos}G`); // Move cursor to correct position
    }
    private repositionCursor() {
        const cursorPos = this.promptlength + this.inPos + 1;
        this.output.write(`\x1B[${cursorPos}G`); // Move cursor to correct position
    }
}

export { Console };