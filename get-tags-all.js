// get all tags from morbooru
// you can use them to update the tags on your danbooru instance

const { exit } = require('process');
const { URL } = require('url');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

if (!process.argv[2]) {
    console.error('Moebooru host required! I need to know where to get your favorites from.');
    console.error('Example: https://konachan.com');
    exit(1)
}

const host = new URL(process.argv[2]);

async function getTags() {
    await exec(`wget "${host.href}tags.json" -O data/${host.hostname}-tags.json`);
}

getTags();