/** Builds a "?a=1&b=2" string, skipping empty values. */
export function toQuery(params: object = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export interface PageParams {
  page?: number
  pageSize?: number
}
