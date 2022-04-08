// get all tags from morbooru
// you can use them to update the tags on your danbooru instance

const fs = require('fs');
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

const tagsFilename = `data/${host.hostname}-tags.json`;

// create file if not exists
if (!fs.existsSync(tagsFilename)) {
    fs.writeFileSync(tagsFilename, '{}');
}

const previousTags = JSON.parse(fs.readFileSync(tagsFilename));

async function getTags() {
    try {
        console.log(`getting all tags from ${host.hostname}, this will take a while...`);
        // we use curl instead of axios here is to avoid the issue of proxies
        // since i cannot get axios to work with proxies
        // specifically, axios does not support https traffic over http proxies
        const ret = await exec(`curl -s -H "Accept: application/json" -H "Content-Type: application/json" -X GET "${host.href}tag.json?limit=0&order:date"`, {
            maxBuffer: 128 * 1024 * 1024, // the data of all tags can get huge, setting this to 128MB
        });
        const response = JSON.parse(ret.stdout)


        response.forEach(i => {
            previousTags[i.name] = i;
        })

    } catch (error) {
        console.error(error)
        exit(1)
    }
}

(async function main() {
    await getTags();
    console.log(`saving changes to ${tagsFilename}`)
    fs.writeFileSync(tagsFilename, JSON.stringify(previousTags));
})()