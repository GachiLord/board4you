import React from "react";
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import { Link } from "react-router-dom";
import { localization } from "../../../common/localization";


export interface BoardInfo {
  id: number,
  public_id: string,
  title: string
}

interface BoardProps {
  loc: localization,
  board: BoardInfo,
  onAdd?: (board: BoardInfo) => void,
  onRemove?: (board: BoardInfo) => void
}

export function Board({ loc, board, onAdd, onRemove }: BoardProps) {
  return (
    <ListGroup.Item key={board.id} className="d-flex justify-content-between">
      <div className="d-inline">
        {board.title === '' ? loc.untitled : board.title}
      </div>
      <div className="d-inline">
        <Link className="ms-5" key={board.id} to={`/board/${board.public_id}`}>
          <Button size="sm" variant="primary">{loc.open}</Button>
        </Link>
        {onAdd && <Button size="sm" className="ms-1" variant="success" onClick={() => onAdd(board)}>{loc.add}</Button>}
        {onRemove && <Button size="sm" className="ms-1" variant="secondary" onClick={() => onRemove(board)}>{loc.del}</Button>}
      </div>
    </ListGroup.Item>
  );
}

