# Board4you
Board4you is a whiteboard app built with Electron, axum, React, Redux Toolkit, react-icons, konva and bootstrap.

![Img](/screenshot.png)

## Features
- endless page
- export to pdf or zip
- auto update
- cross-platform(Windows and Linux)
- tool customization

## Requerments
- npm or pnpm(bun can't build desktop app)
- Wine - to build Windows app on Linux
- rust - to run app in dev mode
- Docker compose - to run app in a container


## Deployment

1. Clone repository:
```bash
git clone https://github.com/GachiLord/board4you
cd board4you
```
2. Create database password(filename: "db_password.txt") and jwt secret(filename: "jwt_secret.txt") files inside board4you/secrets.
They should be strong, possibly random values and of great length.

3. If your server has 6 or more CPU cores and 16G RAM, skip this item. Otherwise consider using provided config for cheap servers(1 CPU core, 1GB RAM) by executing:
```bash
mv db/postgres-cheap-server.conf db/postgres
```

4. Start the app locally by this command:
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
# Database
DB_PORT=5432 # Database's port
DB_HOST=localhost # Database's host
DB_USER=board4you # Database's user
DB_QUEUE_ITER_TIME_MS=200 # Waiting time for new values in the database queue. Greater value = less queries and slower response time. Less value = more queries and faster response time
DB_QUEUE_ITEM_SIZE=1000 # Max number of possible queries that can be executed at a time. Greater size = more used RAM and less queries  
CONNECTION_POOL_SIZE=12 # Size of the database connection pool
CONNECTION_TIMEOUT_SECONDS=30 # Timeout for requesting a client from the connection pool
NO_PERSIST=0 # If set to 1, Operation queue won't be saved into database
# Board state
OPERATION_QUEUE_SIZE=100 # Operation queue is a buffer used to reduce queries to the database. Greater buffer = less queries and more used RAM
# Cleanup
CLEANUP_INTERVAL_MINUTES=30 # Interval used by cleanup function which removes unused rooms from RAM
CACHE_CLEANUP_INTERVAL_SECONDS=10 # Interval used by cleanup_cache function which clears cached data from the database. Greater value = less queries during connection to the room and more used RAM
# Monitoring
MONITOR_INTERVAL_MINUTES=5 # Interval used by monitor function which prints useful info about the app
# Paths
PUBLIC_PATH=${APP}/public # Path to static assets
DB_INIT_PATH="${APP}/db/init.sql" # Path to the database's initial script
DB_PASSWORD_PATH="${APP}/secrets/db_password.txt" # Path to the database's password file
JWT_SECRET_PATH="${APP}/secrets/jwt_secret.txt" # Path to the jwt_secret file
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
