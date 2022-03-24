// get your favorites that are not locally stored and append them to data/${host.hostname}-favorites.json
// new posts will be added to data/${host.hostname}-favorites-new.json
// this will NOT overwrite any existing ones

const fs = require('fs');
const { exit } = require('process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

if (!process.argv[2]) {
    console.error('Host required! I need to know where to get your favorites from.');
    console.error('Example: https://konachan.com');
    exit(1)
}

if (!process.argv[3]) {
    console.error('Username required! I need to know which account to get favorites from.');
    console.error('Example: youraccount');
    exit(1)
}

const host = URL.parse(process.argv[2]);
const username = process.argv[3];
// file to store favorites in
const filename = `data/${host}-favorites.json`;
const newPostsFilename = `data/${host}-favorites-new.json`;

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
const newlyAddedPosts = JSON.parse(fs.readFileSync(newPostsFilename));

// make http request to get user favorites and append them
const getUserFavorites = async (host, username) => {
    try {
        for (let i = 1; ; i++) {
            console.log(`getting favorites from ${host.hostname}, page`, i);

            // we use curl instead of axios here is to avoid the issue of proxies
            // since i cannot get axios to work with proxies
            // specifically, axios does not support https traffic over http proxies
            const ret = await exec(`curl -s -H "Accept: application/json" -H "Content-Type: application/json" -X GET "${host.href}post.json?limit=100&tags=vote:3:${username}%20order:vote&page=${i}"`);
            const response = JSON.parse(ret.stdout)

            if (response.length === 0) {
                console.log("all favorites fetched");
                break;
            }

            
            let allPostsFetchedAreNew = true;
            response.forEach(i => {
                // if this post is already in the favorites file, mark it as not new
                if (favorites[i.id]) {
                    allPostsFetchedAreNew =  false;
                } else {
                    // this is a new post, record it
                    newlyAddedPosts[i.id] = i;
                }

                userFavorites[i.id] = i;
            })

            // if this whole page is already in favorites (not new), we can stop here
            if(!allPostsFetchedAreNew) {
                console.log("all newly added favorites fetched");
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
    console.log('saving changes to', filename, 'with', newlyAddedPosts.length, 'new favorites')
    console.log('newly added favorites will be saved to', newPostsFilename)
    console.log('saving...')
    fs.writeFileSync(filename, JSON.stringify(favorites));
    fs.writeFileSync(newPostsFilename, JSON.stringify(newlyAddedPosts));
    console.log('done')
})();
