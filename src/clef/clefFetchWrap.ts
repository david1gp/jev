import type { SystemOneFetch } from "../system/systemOneFetch.js"

export function clefFetchWrap(fetchFn: SystemOneFetch): SystemOneFetch {
  return async (input, init) => {
    const response = await fetchFn(input, init)
    if (!response.ok) return response
    const text = await response.text()
    try {
      const parsed = JSON.parse(text) as unknown
      if (parsed !== null && typeof parsed === "object" && "result" in parsed) {
        return new Response(JSON.stringify((parsed as { result: unknown }).result), {
          status: response.status,
          headers: response.headers,
        })
      }
    } catch {
      // fall through with the original body
    }
    return new Response(text, { status: response.status, headers: response.headers })
  }
}
