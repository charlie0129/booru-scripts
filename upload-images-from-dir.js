// upload all the images from a directory to your danbooru instance, metadata will be read from your favorites.json file
// you should get your metadata first by running get-user-favorites-delta/all.js

const axios = require('axios').default
var FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const { URL } = require('url');
const { promisify } = require('util');
const { isValidHttpUrl } = require('./util/check-valid-url');
const exec = promisify(require('child_process').exec);

require('dotenv').config();

if (!process.argv[2]) {
    console.error('Moebooru host required! I need the metadata in your <host>-favorites.json file. But I cannot find it without the moebooru hostname.');
    exit(1)
}
const host = new URL(process.argv[2])

const dir = process.argv[3];
if (!dir) {
    console.error('Input directory required! I will upload all the images in that directory.');
    exit(1)
}

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

// list files in directory
let filenames = fs.readdirSync(dir).filter(file => file.match(/\d+/));
const filteredOut = filenames.filter(filePath => !(filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".png"))).map(filePath => filePath.match(/\d+/)[0]);
filenames = filenames.filter(filePath => filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".png"))

const files = filenames.map(file => ({
    filePath: path.format({ base: file, dir }),
    id: file.match(/\d+/)[0],
    filename: `${file}`
}));

const uploadedFilePath = path.format({ base: 'uploaded.json', dir });
const postedFilePath = path.format({ base: 'posted.json', dir });
const mappingFilePath = path.format({ base: 'mapping.json', dir });

if (!fs.existsSync(uploadedFilePath)) {
    fs.writeFileSync(uploadedFilePath, '{}');
}

if (!fs.existsSync(postedFilePath)) {
    fs.writeFileSync(postedFilePath, '{}');
}

if (!fs.existsSync(mappingFilePath)) {
    fs.writeFileSync(mappingFilePath, '{}');
}

// already uploaded files
const uploaded = JSON.parse(fs.readFileSync(uploadedFilePath));
// already posted files
const posted = JSON.parse(fs.readFileSync(postedFilePath));
// id mappings
const mapping = JSON.parse(fs.readFileSync(mappingFilePath));
// favorite images
const favorites = JSON.parse(fs.readFileSync(path.join('data', `${host.hostname}-favorites.json`)));

function saveProgress() {
    console.log("saving progress...");
    fs.writeFileSync(`${dir}/uploaded.json`, JSON.stringify(uploaded));
    fs.writeFileSync(`${dir}/posted.json`, JSON.stringify(posted));
    fs.writeFileSync(`${dir}/mapping.json`, JSON.stringify(mapping));
    console.log("done");
}

process.on('SIGINT', function () {
    console.error("caught interrupt signal, exiting...");
    saveProgress();
    process.exit();
});

async function uploadImage({ filePath, originalId }) {
    try {
        if (!(filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".png"))) {
            throw new Error("not a jpg or png file");
        }

        const stream = fs.createReadStream(filePath)
        const { size } = fs.statSync(filePath);
        const form = new FormData();
        form.append("upload[files][0]", stream, { knownLength: size });
        const response = await axios({
            method: 'post',
            url: `${localHost}uploads.json`,
            data: form,
            headers: {
                ...form.getHeaders(),
                authorization,
                "Content-Length": form.getLengthSync(),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });

        if (response.status >= 400) {
            throw new Error(response);
        }

        uploaded[originalId] = response.data.id;
        process.stdout.write('uploadId=\033[33m' + response.data.id + '\033[0m ');
        return response.data.id;
    } catch (error) {
        console.error(error);
        console.error('\033[33m' + originalId + '\033[0m: upload failed\n');
        saveProgress();
        exit(1);
    }

}

async function postImage({ uploadId, originalId, originalFilename }) {
    try {
        const post = favorites[originalId];

        if (!post) {
            throw new Error(`${originalId}: no post metadata found locally in favorites.json`);
        }

        let source = post.source;
        // if source is not a http url
        if (!isValidHttpUrl(post.source)) {
            // if general string, remove dots in it (as dots will cause problems with danbooru)
            source = source.replaceAll('.', '');
            // if empty string, replace it to file name
            if (!source) {
                source = `file://${originalFilename}`;
            }
        }

        const form = new FormData();
        form.append("upload_media_asset_id", uploadId);
        form.append("post[source]", source);
        form.append("post[rating]", post.rating);
        form.append("post[tag_string]", post.tags);

        const response = await axios.post(
            `${localHost}posts`,
            form, {
            headers: {
                authorization,
                ...form.getHeaders()
            }
        });

        const postId = response.data.match(/posts\/\d+/)[0].match(/\d+/)[0];
        process.stdout.write('postId=\033[33m' + postId + '\033[0m\n');
        posted[originalId] = postId;
        mapping[originalId] = postId;

        return postId;
    } catch (error) {
        console.error(error);
        console.error('\033[33m' + originalId + '\033[0m: post failed, with uploadId=\033[33m' + uploadId + '\033[0m\n');
        saveProgress();
        exit(1);
    }
}

async function startUploading() {
    for (const file of files) {
        process.stdout.write('\033[33m' + file.id + '\033[0m: ');

        let uploadId = uploaded[file.id]
        if (!uploadId) {
            uploadId = await uploadImage({ filePath: file.filePath, originalId: file.id });
        }

        let postId = posted[file.id]
        if (!postId) {
            await postImage({ uploadId, originalId: file.id, originalFilename: file.filename });
        }

        if (uploadId && postId) {
            process.stdout.write(`\r`);
        }
    }
}

startUploading().then(() => {
    if (filteredOut.length > 0) {
        console.warn("The following items are not uploaded due to incorrect file type:", filteredOut);
    }
    saveProgress();
    process.exit();
})
