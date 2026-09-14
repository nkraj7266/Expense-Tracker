import { useEffect, useState } from 'react'
import { listCategories } from '../api/expenses'

export default function useCategories() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  return categories
}
