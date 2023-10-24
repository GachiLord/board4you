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
- Docker compose - to run app in a container

## Development

```bash
# clone the repo
git clone https://github.com/GachiLord/board4you
cd board4you
```
Build and run website in dev mode
```bash
cd client
# build static
pnpm run build
# run and build server
cd ..
chmod +x dev.sh # run only one time
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
cd client
# build
pnpm run buildApp
# run in dev mode(use 2 terminals)
pnpm run dev
pnpm run devMain
```

## Contributing
### Branch naming rules
- wip - Work in progress; stuff that won't be finished soon
- feat - Adding or Expanding Features
- bug - Bug fix or experiment
- junk - Throwaway branch created to experiment
- refactor - Refactoring or major fixes
- chore - Documentation, commets, tests etc

Branch name should consist of tag and description.

Example: bug/fix-modal-message-spelling

### Contribution guide
1. Create a local branch
2. Push it
3. Create a pull request
