import React, { useContext, useState } from "react";
import { useParams } from "react-router";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Loading from "../base/components/Loading";
import Alert from "../base/components/Alert";
import { Board, BoardInfo } from "../board/folder/Board";
import { LocaleContext } from "../base/constants/LocaleContext";
import List from "../base/components/List";
import { Paginated } from "../base/typing/Pagination";
import { request } from "../lib/request";


interface Folder {
  title: string,
  public_id: string,
  contents: Array<BoardInfo>,
  owner_first_name: string,
  owner_second_name: string,
  owner_public_login: string,
  is_owned: boolean,
}

interface FolderInfo {
  public_id: string,
  title: string,
  add_board_ids: number[],
  remove_board_ids: number[]
}

export default function Folder() {
  const [page, setPage] = useState(1)
  const { folderId } = useParams()
  const loc = useContext(LocaleContext)
  const [title, setTitle] = useState("")
  const [contents, setContents] = useState<BoardInfo[]>([])
  const [isLoading, setLoading] = useState(false)
  const boardsQuery = useQuery({
    queryKey: ['room', 'own', page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!folderId) throw new Error('no such folder')
      const boards: Paginated<BoardInfo> = await request(`room/own/${page}`).get().body()
      return boards
    }
  })
  const folderQuery = useQuery({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      if (!folderId) throw new Error('no such folder')
      const folder: Folder = await request(`folder/${folderId}`).get().body()
      setTitle(folder.title)
      setContents(folder.contents)
      return folder
    }
  })
  // handle save
  const handleSave = async () => {
    const folderInfo: FolderInfo = {
      public_id: folderQuery.data.public_id,
      title,
      add_board_ids: contents.filter(b => !folderQuery.data.contents.includes(b)).map(b => b.id),
      remove_board_ids: folderQuery.data.contents.filter(b => !contents.includes(b)).map(b => b.id)
    }
    setLoading(true)
    request('folder').patch().body(folderInfo).finally(() => setLoading(false))
  }
  const handleTitleChange = (title: string) => {
    if (title.length <= 36) setTitle(title)
  }
  // handle request load and error
  if (folderQuery.isPending || boardsQuery.isPending || isLoading) return <Loading title="Folder is loading" />
  if (folderQuery.isError || boardsQuery.isError) return (
    <Alert title={loc.noSuchFolder}>
      <Link to='/'><Button variant="primary">{loc.home}</Button></Link>
    </Alert>
  )
  // render
  return (
    <div className="container d-flex flex-column justify-content-center align-items-center mt-5">
      <Form.Group className="mb-3" controlId="formBasicEmail">
        <Form.Control
          type="text"
          placeholder="Title"
          disabled={!folderQuery.data.is_owned}
          onChange={(e) => { handleTitleChange(e.target.value) }}
          value={title}
        />
      </Form.Group>
      <h4>{loc.folderContents}</h4>
      <ListGroup className="m-3">
        {contents.length === 0 && loc.noBoardsYet}
        {contents.map(board => Board({
          loc,
          board,
          onRemove: (folderQuery.data.is_owned) && (b => setContents(v => v.filter(i => i.id !== b.id)))
        }))}
      </ListGroup>
      {(boardsQuery.data.content.length !== 0 && folderQuery.data.is_owned) && <h4>{loc.boardsToAdd}</h4>}
      <List
        pagination={{
          contents: boardsQuery.data.content,
          currentPage: page,
          maxPage: boardsQuery.data.max_page,
          onPrev: () => setPage(v => v - 1),
          onNext: () => setPage(v => v + 1),
          onIndex: (index) => setPage(index)
        }}

      >
        <ListGroup className="m-3">
          {folderQuery.data.is_owned && (
            boardsQuery.data.content.filter(b => contents.findIndex(c => c.id === b.id) === -1).map(b => Board({
              loc,
              board: b,
              onAdd: (board => setContents(v => v.concat([board])))
            }))
          )}
        </ListGroup>

      </List>
      {folderQuery.data.is_owned && <Button className="m-3" variant="primary" onClick={handleSave}>{loc.save}</Button>}
    </div>
  )
}


