import { useParams } from "react-router-dom"

export default function usePage() {
  const { page } = useParams()
  const pageIndex = isNaN(Number(page)) ? 1 : Math.abs(Number(page))

  return pageIndex
}
