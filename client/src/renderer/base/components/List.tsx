import React from "react";
import { PaginationProps } from "../../base/typing/Pagination";
import Pagination from 'react-bootstrap/Pagination';


interface Props {
  children: React.ReactNode,
  pagination: PaginationProps<unknown>
}

export default function List({ children, pagination }: Props) {
  const items = [];
  for (let index = Math.max(1, pagination.currentPage - 5); index <= Math.min(pagination.maxPage, 5); index++) {
    items.push(
      <Pagination.Item
        key={index}
        active={index === pagination.currentPage}
        onClick={() => {
          if (index !== pagination.currentPage) pagination.onIndex(index)
        }}
      >
        {index}
      </Pagination.Item >
    );
  }

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center">
      {children}
      <Pagination>
        <Pagination.First onClick={() => pagination.onIndex(1)} disabled={pagination.currentPage <= 1} />
        <Pagination.Prev onClick={pagination.onPrev} disabled={pagination.currentPage <= 1} />
        {items}
        <Pagination.Next onClick={pagination.onNext} disabled={pagination.currentPage >= pagination.maxPage} />
        <Pagination.Last onClick={() => pagination.onIndex(pagination.maxPage)} disabled={pagination.currentPage >= pagination.maxPage} />
      </Pagination>
    </div>
  )
}
