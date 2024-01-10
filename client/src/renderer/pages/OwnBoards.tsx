import React, { useContext, useState } from "react";
import { Button, ListGroup } from "react-bootstrap";
import { Board, BoardInfo } from "../board/folder/Board";
import { useQuery } from "@tanstack/react-query";
import { doRequest } from "../lib/twiks";
import Loading from "../base/components/Loading";
import Alert from "../base/components/Alert";
import { Link } from "react-router-dom";
import { LocaleContext } from "../base/constants/LocaleContext";


export default function OwnBoards() {
  const [boards, setBoards] = useState<BoardInfo[]>([])
  const { isPending, isError } = useQuery({
    queryKey: ['room', 'own'],
    queryFn: async () => {
      const boards: BoardInfo[] = await doRequest('room/own', undefined, 'GET')
      setBoards(boards)
      return boards
    }
  })
  const loc = useContext(LocaleContext)

  if (isPending) return <Loading title="Loading your boards" />
  if (isError) return (
    <Alert title="Log in to view your boards">
      <Link to="/"><Button>{loc.home}</Button></Link>
    </Alert>
  )

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center mt-5">
      <h4>{loc.yourBoards}</h4>

      <ListGroup className="m-3">
        {
          boards.map(board => Board({ board }))
        }
      </ListGroup>
    </div>)
}
