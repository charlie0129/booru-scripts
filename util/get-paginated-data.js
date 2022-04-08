// get paginated data from Moebooru, e.g. https://konachan.com/post.json?limit=100&page=1
// combine them, and convert it to JSON

const defaultOptions = {
    url: "",
    limit: 100,
    fromPage: 1,
    toPage: 0,
    // only update 
    deltaUpdate: false,
    previousData: {},
    dataIdentifier: "id",
}

export function getPaginatedData() {

}