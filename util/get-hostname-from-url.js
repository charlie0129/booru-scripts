
const { exit } = require("process");

const href = process.argv[2];

if (!href) {
    console.error("no input");
    exit(1);
}

const url = new URL(href);

console.log(url.hostname);
