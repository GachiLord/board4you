import React, { useState } from "react";
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { Link } from "react-router-dom";


interface Board {
  id: number,
  public_id: string,
  title: string
}

interface Props {
  board: Board
  onDelete?: (public_id: string) => void,
  onAdd?: (board: Board) => void
}

export default function Board({ board, onDelete, onAdd }: Props) {
  const { title, public_id } = board;
  const [isDeleted, setDelete] = useState(false)
  const handleDelete = () => {
    setDelete(true)
    onDelete(public_id)
  }
  const handleAdd = () => {
    setDelete(true)
    onAdd(board)
  }

  if (isDeleted) return (<></>)
  return (
    <Card>
      <Card.Header>{title}</Card.Header>
      <Card.Body>
        <Link to={`board/${public_id}`}><Button variant='primary'>Open</Button></Link>
        {onAdd && <Button variant="success" onClick={handleAdd}>Add</Button>}
        {onDelete && <Button variant='secondary' onClick={handleDelete}>Delete</Button>}
      </Card.Body>
    </Card>
  )
}
