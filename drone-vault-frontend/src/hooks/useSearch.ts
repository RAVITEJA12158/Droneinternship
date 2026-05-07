'use client'
import { useState, useCallback, useEffect } from 'react'
import { searchApi, SearchResults } from '@/lib/api/search'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null)
      return
    }
    setIsSearching(true)
    try {
      const data = await searchApi.search(q)
      setResults(data)
    } catch {
      setResults({ projects: [], missions: [], files: [] })
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  return { query, setQuery, results, isSearching }
}
