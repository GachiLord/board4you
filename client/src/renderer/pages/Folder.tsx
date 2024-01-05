import React, { useState } from "react";
import { useParams } from "react-router";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import { useQuery } from "@tanstack/react-query";
import { doRequest } from "../lib/twiks";
import { Link } from "react-router-dom";
import Loading from "../base/components/Loading";
import Alert from "../base/components/Alert";


interface BoardInfo {
  id: number,
  public_id: string,
  title: string
}

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
  const { folderId } = useParams()
  const [title, setTitle] = useState("")
  const [contents, setContents] = useState<BoardInfo[]>([])
  const [isLoading, setLoading] = useState(false)
  const boardsQuery = useQuery({
    queryKey: ['room', 'own'],
    queryFn: async () => {
      if (!folderId) throw new Error('no such folder')
      const boards: BoardInfo[] = await doRequest('room/own', undefined, 'GET')
      return boards
    }
  })
  const folderQuery = useQuery({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      if (!folderId) throw new Error('no such folder')
      const folder: Folder = await doRequest(`folder/${folderId}`, undefined, 'GET')
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
    doRequest('folder', folderInfo, 'PATCH').finally(() => setLoading(false))
  }
  // handle request load and error
  if (folderQuery.isPending || boardsQuery.isPending || isLoading) return <Loading title="Folder is loading" />
  if (folderQuery.isError || boardsQuery.isError) return (
    <Alert title='No such folder'>
      <Link to='/'><Button variant="primary">Home</Button></Link>
    </Alert>
  )
  // render
  return (
    <div className="container d-flex flex-column justify-content-center align-items-center mt-5">
      <Form.Group className="mb-3" controlId="formBasicEmail">
        <Form.Control type="text" placeholder="Title" defaultValue={title} />
      </Form.Group>
      <h4>Folder contents</h4>
      <ListGroup className="m-3">
        {contents.length === 0 && "No boards yet"}
        {contents.map(board => Board({
          board,
          onRemove: (b => setContents(v => v.filter(i => i.id !== b.id)))
        }))}
      </ListGroup>
      {(boardsQuery.data.length !== 0 && folderQuery.data.is_owned) && <h4>Boards to add</h4>}
      <ListGroup className="m-3">
        {folderQuery.data.is_owned && (
          boardsQuery.data.filter(b => contents.findIndex(c => c.id === b.id) === -1).map(b => Board({
            board: b,
            onAdd: (board => setContents(v => v.concat([board])))
          }))
        )}
      </ListGroup>
      {folderQuery.data.is_owned && <Button className="m-3" variant="primary" onClick={handleSave}>Save</Button>}
    </div>
  )
}

interface BoardProps {
  board: BoardInfo,
  onAdd?: (board: BoardInfo) => void,
  onRemove?: (board: BoardInfo) => void
}
function Board({ board, onAdd, onRemove }: BoardProps) {
  return (
    <ListGroup.Item key={board.id} className="d-flex justify-content-between">
      <div className="d-inline">
        {board.title}
      </div>
      <div className="d-inline">
        <Link className="ms-5" key={board.id} to={`/board/${board.public_id}`}>
          <Button size="sm" variant="primary">Open</Button>
        </Link>
        {
          onAdd && <Button size="sm" className="ms-1" variant="success" onClick={() => onAdd(board)}>Add</Button>
        }
        {
          onRemove && <Button size="sm" className="ms-1" variant="secondary" onClick={() => onRemove(board)}>Remove</Button>
        }
      </div>
    </ListGroup.Item >
  )
}
