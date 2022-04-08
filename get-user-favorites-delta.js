// get your favorites that are not locally stored and append them to data/${host.hostname}-favorites.json
// new posts will be added to data/${host.hostname}-favorites-delta.json
// this will NOT overwrite any existing ones

const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

if (!process.argv[2]) {
    console.error('Moebooru host required! I need to know where to get your favorites from.');
    console.error('Example: https://konachan.com');
    exit(1)
}

if (!process.argv[3]) {
    console.error('Moebooru username required! I need to know which account to get favorites from.');
    console.error('Example: youraccount');
    exit(1)
}

const host = new URL(process.argv[2]);
const username = process.argv[3];
// file to store favorites in
const filename = path.join('data', `${host.hostname}-favorites.json`);
const newPostsFilename = path.join('data', `${host.hostname}-favorites-delta.json`);

// create file if not exists
if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, '{}');
}
if (!fs.existsSync(newPostsFilename)) {
    fs.writeFileSync(newPostsFilename, '{}');
}

// read previous favorites
const favorites = JSON.parse(fs.readFileSync(filename));
// this will record newly added favorites
// we will not clear previous ones
// since we will do something to them later
// for example, we will upload them to our own server, and then delete them from
const newlyAddedPosts = JSON.parse(fs.readFileSync(newPostsFilename));

// make http request to get user favorites and append them
const getUserFavorites = async (host, username) => {
    let count = 0;
    try {
        for (let i = 1; ; i++) {
            console.log(`getting favorites from ${host.hostname}, page`, i);

            // we use curl instead of axios here is to avoid the issue of proxies
            // since i cannot get axios to work with proxies
            // specifically, axios does not support https traffic over http proxies
            const ret = await exec(`curl -s -H "Accept: application/json" -H "Content-Type: application/json" -X GET "${host.href}post.json?limit=25&tags=vote:3:${username}%20order:vote&page=${i}"`);
            const response = JSON.parse(ret.stdout)

            if (response.length === 0) {
                console.log("all favorites fetched");
                break;
            }


            let allPostsAreOld = true;
            response.forEach(i => {
                if (!favorites[i.id]) {
                    allPostsAreOld = false;
                    // this is a new post, record it
                    newlyAddedPosts[i.id] = i;
                    count++;
                }

                favorites[i.id] = i;
            })

            // if this whole page is already in favorites (not new), we can stop here
            if (allPostsAreOld) {
                console.log(count, "newly added favorites fetched");
                break;
            }
        }

        return
    } catch (error) {
        console.error(error)
        exit(1)
    }
}

(async () => {
    await getUserFavorites(host, username);
    console.log('saving changes to', filename)
    console.log('newly added favorites will be saved to', newPostsFilename)
    console.log('saving...')
    fs.writeFileSync(filename, JSON.stringify(favorites));
    fs.writeFileSync(newPostsFilename, JSON.stringify(newlyAddedPosts));
    console.log('done')
})();
