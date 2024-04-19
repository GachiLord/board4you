# Board4you
Board4you is a whiteboard app built with Electron, warp, React, Redux Toolkit, react-icons, konva and bootstrap.

![Img](/screenshot.png)

## Features
- endless page
- export to pdf or zip
- auto update
- cross-platform(windows and linux)
- tool customization

## Requerments
- npm or pnpm(bun can't build desktop app)
- Wine - to build Windows app on Linux
- rust - to run app in dev mode
- Docker compose - to run app in a container


## Deployment

Clone repository:
```bash
git clone https://github.com/GachiLord/board4you
cd board4you
```
Create database password(filename: "db_password.txt") and jwt secret(filename: "jwt_secret.txt") files inside board4you/secrets.
They should be strong, possibly random values and of great length.

Start the app locally by this command:
```bash
docker compose up db web -d
```
It will launch database and app's server.

Deploying Board4you publicly requires you to use some proxy, e.g. Nginx.
You should configure your proxy like this:
```bash
# <public route> => <local address>
/ => http://localhost:3000 # Http server
/ws/board => http://localhost:3000/ws/board # WebSocket server
```

### Configuration

Board4you is configureted by changing docker-compose.yml.
Typically you will need to edit web service in the compose file(environment section).
Here is a list of environment variables changing the app's behaviour and their default values:
```bash
export DB_PORT=5432 # database's port
export DB_HOST=localhost # database's host
export DB_USER=board4you # database's user
export CLEANUP_INTERVAL_MINUTES=30 # this value is used in the cleanup task, that deletes unused rooms from RAM and saves them into database
export MONITOR_INTERVAL_MINUTES=1 # this value is used in the monitor task, that logs information about the server
export NO_PERSIST=1 # if set to 1, rooms in RAM will not be saved into database
```

## Development

```bash
# clone the repo
git clone https://github.com/GachiLord/board4you
cd board4you
```
Build and run website in dev mode
```bash
cd client
# make scripts executable
pnpm run grantPersmissions
# build website
pnpm run buildWeb
# run and build server
cd ..
./dev.sh
```
Build and run website in prod mode
```bash
# start server
docker compose up -d
# stop server
docker compose down
```

Build and run desktop app
```bash
# run dev
pnpm run devDesktop
# build for prod
pnpm run devMain
```
Build desktop app
```bash
pnpm run buildApp
```

## Contributing
### Branch naming rules
- wip - Work in progress; stuff that won't be finished soon
- feat - Adding or Expanding Features
- bug - Bug fix or experiment
- junk - Throwaway branch created to experiment
- refactor - Refactoring or major fixes
- chore - Documentation, comments, tests etc

Branch name should consist of tag and description.

Example: bug/fix-modal-message-spelling

### Contribution guide
1. Create a local branch
2. Push it
3. Create a pull request
