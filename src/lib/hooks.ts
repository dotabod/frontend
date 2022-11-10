"use client"

import { useEffect, useState } from "react"

export const useBaseUrl = (append?: string) => {
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const base = window.location.protocol + "//" + window.location.host
    setBaseUrl(append ? `${base}/${append}` : base)
  }, [append])

  return baseUrl
}
