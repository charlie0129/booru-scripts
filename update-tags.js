// update tags on you danbooru instance from your <host>-tags.json file

const axios = require('axios').default
const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const { promisify } = require('util');

if (!process.argv[2]) {
    console.error('Moebooru host required! I need to know which <host>-tags.json file to get tags.');
    console.error('Example: https://konachan.com');
    exit(1)
}

const host = new URL(process.argv[2]).hostname;

const localHost = new URL(process.env.DANBOORU_HOST);
const username = process.env.DANBOORU_USERNAME;
const apiKey = process.env.DANBOORU_APIKEY;

if (!localHost || !username || !apiKey) {
    console.error('You need to set DANBOORU_HOST, DANBOORU_USERNAME, and DANBOORU_APIKEY in your environment or .env file');
    console.error('DANBOORU_HOST will be you Danbooru host, e.g. https://danbooru.donmai.us');
    console.error('DANBOORU_USERNAME will be your Danbooru username');
    console.error('DANBOORU_APIKEY will be your Danbooru API key');
    exit(1)
}

const authorization = "Basic " + Buffer.from(`${username}:${apiKey}`).toString('base64');

const tags = {}

if(!fs.existsSync(path.join('data', `${host}-tags.json`))) {
    console.error(`No ${host}-tags.json file found!`);
    console.error(`You need to get it with get-tags-all.js first.`);
    exit(1);
}

const remoteTagsOrig = JSON.parse(fs.readFileSync(path.join('data', `${host}-tags.json`)));
const remoteTags = {}
remoteTagsOrig.forEach(i => {
    remoteTags[i.name] = i;
})

if(!fs.existsSync(path.join('data', `${host}-tags-updated.json`))) {
    fs.writeFileSync(path.join('data', `${host}-tags-updated.json`), '{}');
}

const updatedTags = JSON.parse(fs.readFileSync(path.join('data', `${host}-tags-updated.json`)));

function saveProgress() {
    console.log("saving progress...");
    fs.writeFileSync(path.join('data', `${host}-tags-updated.json`), JSON.stringify(updatedTags));
    console.log("done");
}

process.on('SIGINT', function () {
    console.error("caught interrupt signal, exiting...");
    saveProgress();
    process.exit();
});

async function getTags() {
    for (let i = 1; ; i++) {
        console.log("getting page", i);

        const res = await axios.get(`${localHost}/tags.json?limit=100&page=${i}`)
        const resTags = res.data

        if (resTags.length === 0) {
            console.log("no more pages");
            break;
        }

        resTags.forEach(i => {
            tags[i.name] = i;
        })
    }

}

async function updateTag(id, type, name) {
    await axios.put(`${localHost}/tags/${id}.json`, {
        category: type <= 5 ? type : 5,
    }, {
        headers: {
            authorization,
        }
    })
        .then(res => {
            updatedTags[name] = type;
        })
        .catch(e => {
            console.error(e.response.data);
        })
}

(async () => {
    await getTags();

    for (let i in tags) {
        const tag = tags[i];
        const remoteTag = remoteTags[i];

        if (!remoteTag || !tag) {
            console.error(`${tag.name}: not found on remote, skipping`);
            continue;
        }

        if (updatedTags[i] !== undefined) {
            // console.log(`${i}: already updated`);
            continue;
        }

        if (tag.name !== remoteTag.name) {
            console.error("tag name mismatch", tag.name, remoteTag.name);
            exit(1);
        }

        console.log(`${tag.name}: updating tag`);
        await updateTag(tag.id, remoteTag.type, tag.name);

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    saveProgress();
})();

