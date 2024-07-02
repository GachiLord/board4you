import BoardManager from "../../../lib/BoardManager/BoardManager";

export default function pull(boardManager: BoardManager, token: string) {
  boardManager.send('Auth', {
    token
  })
}
