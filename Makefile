# Moebooru host to get your favoirite and download images from
# you should set this from thr command line, like this
# make <target> MOEBOORU_HOST=yande.re
# or just set env variable MOEBOORU_HOST=yande.re
export MOEBOORU_HOST
MOEBOORU_HOSTNAME=$(shell node util/get-hostname-from-url.js $(MOEBOORU_HOST))


# Your directory to store your images (separated by hostname)
ifdef IMAGE_DIR
IMAGE_DIR=$(IMAGE_DIR)
else
IMAGE_DIR=$(HOME)/Pictures/$(MOEBOORU_HOSTNAME)
endif


# Moebooru username to get your favoirite
# you should set this from thr command line, like this
# make <target> MOEBOORU_USERNAME=username
# or just set env variable MOEBOORU_USERNAME=username
export MOEBOORU_USERNAME

# proxy server to use to connect to moebooru (optional)
# you should set this from thr command line, like this
# make <target> PROXY=http://127.0.0.1:1087
export PROXY

all: get_favorites_and_sync_to_danbooru


get_favorites_and_sync_to_danbooru:
# get your favorite images from moebooru (only the ones that are not already fetched)
	@echo "\033[32;1mGetting your favorites...\033[0m"
	export http_proxy=$(PROXY) && export https_proxy=$(PROXY) && node get-user-favorites-delta.js $(MOEBOORU_HOST) $(MOEBOORU_USERNAME)
# download them (original images)
	@echo "\033[32;1mDownload them...\033[0m"
	export http_proxy=$(PROXY) && export https_proxy=$(PROXY) && node download-post-images.js data/$(MOEBOORU_HOSTNAME)-favorites-delta.json $(IMAGE_DIR)
# upload them to your danbooru instance (your danbooru host and account need to be set in the .env)
	@echo "\033[32;1mUploading them to your danbooru instance...\033[0m"
	node upload-images-from-dir.js $(MOEBOORU_HOST) $(IMAGE_DIR)
# update local status, set them as updated by removing them from the <host>-favorites-delta.json
	node update-favorites-delta.js $(MOEBOORU_HOST) $(IMAGE_DIR)

