// download images in posts

const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

if (!process.argv[2]) {
    console.error('Input JSON file required! I need to know which posts to download.');
    console.error('Example: konachan.com-favorites-delta.json');
    console.error('It will have contents like this (simplified):', {
        '251867': {
            id: 251867,
            tags: 'alexmaster pantsu seifuku thighhighs',
            author: '椎名深夏',
            source: 'http://i2.pixiv.net/img26/img/alexmaster/35130652.jpg',
            score: 32,
            file_size: 175557,
            file_ext: 'jpg',
            file_url: 'https://files.yande.re/image/6e2248827b2006e584c6bd92740056e7/yande.re%20251867%20alexmaster%20pantsu%20seifuku%20thighhighs.jpg',
        }
    });
    exit(1)
}

// read which posts to download from json file
const posts = JSON.parse(fs.readFileSync(process.argv[2]));

if(!process.argv[3]) {
    console.warn('Destination directory not specified. I will use the current directory.');
}
const destination = process.argv[3] || './';

// list files in destination
let filenames = fs.readdirSync(destination).filter(file => file.match(/\d+/)).filter(filePath => filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".png"));
const filesInDestination = {}
filenames.forEach(filename => {
    const id = filename.match(/\d+/)[0];
    filesInDestination[id] = {
        filePath: path.format({ dir: destination, base: filename }),
        filename: `${filename}`,
        id,
    };
})


async function downloadPosts(posts) {
    for (const postId in posts) {
        const post = posts[postId];

        // if the post is already downloaded, skip it
        if (filesInDestination[post.id]) {
            console.log('post already downloaded:', post.id);
            continue;
        }

        const imgUrl = new URL(post.file_url);

        console.log("downloading", post.id, "from", imgUrl.host);

        await exec(`cd "${destination}" && wget "${imgUrl.href}"`);
    }
}

downloadPosts(posts);
