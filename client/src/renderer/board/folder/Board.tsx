import React from "react";
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link } from "react-router-dom";


export interface BoardInfo {
  id: number,
  public_id: string,
  title: string
}

interface BoardProps {
  board: BoardInfo,
  onAdd?: (board: BoardInfo) => void,
  onRemove?: (board: BoardInfo) => void
}

export function Board({ board, onAdd, onRemove }: BoardProps) {
  return (
    <ListGroup.Item key={board.id} className="d-flex justify-content-between">
      <div className="d-inline">
        {board.title}
      </div>
      <div className="d-inline">
        <Link className="ms-5" key={board.id} to={`/board/${board.public_id}`}>
          <Button size="sm" variant="primary">Open</Button>
        </Link>
        {onAdd && <Button size="sm" className="ms-1" variant="success" onClick={() => onAdd(board)}>Add</Button>}
        {onRemove && <Button size="sm" className="ms-1" variant="secondary" onClick={() => onRemove(board)}>Remove</Button>}
      </div>
    </ListGroup.Item>
  );
}

