# Board4you
Board4you is a whiteboard app built with Electron, warp, React, Redux Toolkit, react-icons, konva and bootstrap.

![Img](/screenshot.png)

## Features
- endless page
- export to pdf or zip
- auto update
- cross-platform(windows and linux)
- tool customization

## Development
You need Wine to build Windows app on Linux

```bash
# clone the repo
git clone https://github.com/GachiLord/board4you
cd board4you
```
Build and run website
```bash
# build client
cd client
# build website
pnpm run build
# run and build server
cd ..
chmod +x dev.sh
./dev.sh
```
Build and run desktop app
```bash
# run dev
pnpm run devMain
# build for prod
pnpm run buildApp
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
