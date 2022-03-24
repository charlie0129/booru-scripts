# Moebooru host to get your favoirite and download images from
# you should set this from thr command line, like this
# make <target> MOEBOORU_HOST=yande.re
MOEBOORU_HOST=
MOEBOORU_HOSTNAME=$(shell node -e 'const{exit}=require("process");const u="$(MOEBOORU_HOST)";if(u)console.log(new URL(u).hostname);else{console.error("MOEBOORU_HOST not set");exit(1);}')


# Your directory to store your images (separated by hostname)
IMAGE_DIR=/Users/$(USER)/Pictures/$(MOEBOORU_HOSTNAME)


# Moebooru username to get your favoirite
# you should set this from thr command line, like this
# make <target> MOEBOORU_HOST=yande.re
MOEBOORU_USERNAME=

# proxy server to use to connect to moebooru (optional)
# you should set this from thr command line, like this
# make <target> PROXY=http://127.0.0.1:1087
export PROXY

all: get_favorites_and_sync_to_danbooru


get_favorites_and_sync_to_danbooru:
# get your favorite images from moebooru (only the ones that are not already fetched)
	export http_proxy=$(PROXY) && export https_proxy=$(PROXY) && node get-user-favorites-delta.js $(MOEBOORU_HOST) $(MOEBOORU_USERNAME)
# download them (original images)
	export http_proxy=$(PROXY) && export https_proxy=$(PROXY) && node download-post-images.js data/$(MOEBOORU_HOSTNAME)-favorites-delta.json $(IMAGE_DIR)
# upload them to your danbooru instance (your danbooru host and account need to be set in the .env)
	node upload-images-from-dir.js $(MOEBOORU_HOST) $(IMAGE_DIR)
	node update-favorites-delta.js $(MOEBOORU_HOST) $(IMAGE_DIR)

