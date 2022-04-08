// get all tags from moebooru
// you can use them to update the tags on your danbooru instance

const { exit } = require('process');
const { URL } = require('url');
const fs = require('fs');
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
    // as of moebooru sites, 
    // in konachan.com API, the `page` param is not working (apr 2022)
    // so we need to exit here
    if (host.hostname === 'konachan.com') {
        console.error('IMPORTANT: konachan.com currently does not support the API (see comments in source code). You need to use get-tags-all.js, instead of this one. exiting...');
        exit(1);
    }

    let count = 0;
    try {
        for (let i = 1; ; i++) {
            console.log(`getting tags from ${host.hostname}, page`, i);

            // we use curl instead of axios here is to avoid the issue of proxies
            // since i cannot get axios to work with proxies
            // specifically, axios does not support https traffic over http proxies
            const ret = await exec(`curl -s -H "Accept: application/json" -H "Content-Type: application/json" -X GET "${host.href}tag.json?limit=25&order:date&page=${i}"`);
            const response = JSON.parse(ret.stdout)

            if (response.length === 0) {
                console.log("all tags fetched");
                break;
            }


            let allTagsAreOld = true;
            response.forEach(i => {
                // this is a new tag
                if (!previousTags[i.name]) {
                    allTagsAreOld = false;
                    count++;
                }

                previousTags[i.name] = i;
            })

            // if this whole page is already in previousTags (not new), we can stop here
            if (allTagsAreOld) {
                console.log(count, "newly added tags fetched");
                break;
            }
        }

        return
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
