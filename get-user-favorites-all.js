// get all your favorites and write them to data/${host.hostname}-favorites.json
// this will overwrite any existing ones

const fs = require('fs');
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
const filename = path.JSON('data', `${host.hostname}-favorites.json`);

// make http request to get user favorites
const getUserFavorites = async (host, username) => {
    const userFavorites = {};

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

            response.forEach(i => {
                userFavorites[i.id] = i;
            })
        }

        return userFavorites
    } catch (error) {
        console.error(error)
        exit(1)
    }
}

(async () => {
    const favorites = await getUserFavorites(host, username);
    console.log(`saving changes to ${filename}`)
    fs.writeFileSync(filename, JSON.stringify(combinedFavorites));
})();
