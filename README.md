# QI Dashboard Backend Demo

This repository contains a prototype of the backend service meant to be used to demo the QI Dashboard.

## Requirements

You will need to:

* Have [Docker installed](https://www.docker.com/community-edition#/download)

* [Generate a GitHub personal access token](https://github.com/settings/tokens/new) -- no scopes need to be selected on the token generation page

### Build a Docker image

    sudo docker build -t avtar/qi-dashboard-backend .

### Run a container

```
sudo docker run \
-d \
-p 3000:3000 \
--name="qi-dashboard-backend" \
-e GITHUB_PERSONAL_ACCESS_TOKEN=<your token here> \
avtar/qi-dashboard-backend
```
