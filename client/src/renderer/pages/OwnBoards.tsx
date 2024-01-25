import React, { useContext, useState } from "react";
import { Button, ListGroup } from "react-bootstrap";
import { Board, BoardInfo } from "../board/folder/Board";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { doRequest } from "../lib/twiks";
import Loading from "../base/components/Loading";
import Alert from "../base/components/Alert";
import { Link, useNavigate } from "react-router-dom";
import { LocaleContext } from "../base/constants/LocaleContext";
import store from "../store/store";
import { Paginated, PaginatedDefault } from "../base/typing/Pagination";
import List from "../base/components/List";
import usePage from "../lib/usePage";


export default function OwnBoards() {
  const page = usePage()
  const navigate = useNavigate()
  const loc = useContext(LocaleContext)
  const [pagination, setPagination] = useState<Paginated<BoardInfo>>(PaginatedDefault)
  const { isPending, isError } = useQuery({
    queryKey: ['room', 'own', page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const boards: Paginated<BoardInfo> = await doRequest(`room/own/${page}`, undefined, 'GET')
      setPagination(boards)
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
        setPagination(value => {
          return { ...value, content: value.content.filter(b => b.id !== board.id) }
        })
      })
  }

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center mt-5">
      <h4>{loc.yourBoards}</h4>
      <List
        pagination={{
          contents: pagination.content,
          currentPage: page,
          maxPage: pagination.max_page,
          onPrev: () => navigate(`/boards/own/${page - 1}`),
          onNext: () => navigate(`/boards/own/${page + 1}`),
          onIndex: (index) => navigate(`/boards/own/${index}`)
        }}
      >
        <ListGroup className="m-3">
          {
            pagination.content.map(board => Board({ board, loc, onRemove }))
          }
        </ListGroup>

      </List>
    </div >)
}
