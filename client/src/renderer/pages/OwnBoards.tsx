import React, { useContext, useState } from "react";
import { Button, ListGroup } from "react-bootstrap";
import { Board, BoardInfo } from "../board/folder/Board";
import { useQuery } from "@tanstack/react-query";
import { doRequest } from "../lib/twiks";
import Loading from "../base/components/Loading";
import Alert from "../base/components/Alert";
import { Link } from "react-router-dom";
import { LocaleContext } from "../base/constants/LocaleContext";
import store from "../store/store";


export default function OwnBoards() {
  const loc = useContext(LocaleContext)
  const [boards, setBoards] = useState<BoardInfo[]>([])
  const { isPending, isError } = useQuery({
    queryKey: ['room', 'own'],
    queryFn: async () => {
      const boards: BoardInfo[] = await doRequest('room/own', undefined, 'GET')
      setBoards(boards)
      return boards
    }
  })
  // loading and error

  if (isPending) return <Loading title={loc.loading} />
  if (isError) return (
    <Alert title={loc.signInToPerformThisAction}>
      <Link to="/"><Button>{loc.home}</Button></Link>
    </Alert>
  )
  // handlers
  const onRemove = (board: BoardInfo) => {
    const rooms = store.getState().rooms
    doRequest('room', { public_id: board.public_id, private_id: rooms[board.public_id] }, 'DELETE')
      .catch((e) => console.log(e))
      .finally(() => {
        setBoards((boards) => boards.filter(b => b.public_id !== board.public_id))
      })
  }

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center mt-5">
      <h4>{loc.yourBoards}</h4>

      <ListGroup className="m-3">
        {
          boards.map(board => Board({ board, loc, onRemove }))
        }
      </ListGroup>
    </div>)
}
