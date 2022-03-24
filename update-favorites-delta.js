// ${host}-favorites-delta.json is holding all the posts from your favorite boards but the images are NOT downloaded yet
// this will update ${host}-favorites-delta.json after you downloaded the images from your favorite boards
const axios = require('axios').default
const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

if (!process.argv[2]) {
    console.error('Moebooru host required! I need to know which <host>-favorites-delta.json file to get posts.');
    console.error('Example: https://konachan.com');
    exit(1)
}

const dir = process.argv[3];
if (!dir) {
    console.error('Input directory required! I will check all the images in that directory and remove them from <host>-favorites-delta.json.');
    exit(1)
}

const host = new URL(process.argv[2]);

const newPostsFilename = path.join('data', `${host.hostname}-favorites-delta.json`);

const newlyAddedPosts = JSON.parse(fs.readFileSync(newPostsFilename));
const oldLength = Object.keys(newlyAddedPosts).length;

// list files in directory
let filenames = fs.readdirSync(dir).filter(file => file.match(/\d+/));
const filteredOut = filenames.filter(filePath => !(filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".png"))).map(filePath => filePath.match(/\d+/)[0]);
filenames = filenames.filter(filePath => filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".png"))

const files = filenames.map(file => ({
    filePath: path.format({ base: file, dir }),
    id: file.match(/\d+/)[0],
    filename: `${file}`
}));

files.forEach(file => {
    const post = newlyAddedPosts[file.id];
    if (post) {
        delete newlyAddedPosts[file.id];
    }
})

const newLength = Object.keys(newlyAddedPosts).length;

console.log(`${host.hostname}-favorites-delta.json updated: deleted`, oldLength - newLength, 'posts', 'with', newLength, 'left');

fs.writeFileSync(newPostsFilename, JSON.stringify(newlyAddedPosts));