# QI Dashboard Backend Demo

This repository contains a prototype of the backend service meant to be used to demo the QI Dashboard. 

## Requirements

You will need to:

* Meet some basic [Vagrant requirements](https://github.com/GPII/qi-development-environments/#requirements)

* [Generate a GitHub personal access token](https://github.com/settings/tokens/new) and provide it in your ``provisioning/secrets.yml`` file. No scopes need to be selected on the token generation page.

## Use a container

The same VM mentioned above can be used to build a Docker image and run containers.

### Build an image

    sudo docker build -t avtar/qi-dashboard-backend .

### Run a container

```
sudo docker run \
-d \ 
-p 3000:3000 \
--name="qi-dashboard-backend" \
-e GITHUB_ACCESS_TOKEN=<your token here> \ 
avtar/qi-dashboard-backend
```
