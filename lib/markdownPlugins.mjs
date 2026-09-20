import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkCjkFriendly from "remark-cjk-friendly/parseOnly"

// Parse CJK punctuation next to * / ** as emphasis without rewriting source
// text or touching escaped markers, code, math, links, or raw HTML.
export const markdownPlugins = [remarkGfm, remarkMath, remarkCjkFriendly]
