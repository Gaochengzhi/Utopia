import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import { markdownPlugins } from "../lib/markdownPlugins.mjs"

const render = (source, plugins = markdownPlugins) => renderToStaticMarkup(
    React.createElement(ReactMarkdown, { remarkPlugins: plugins }, source)
)

test("CJK punctuation touching bold/italic delimiters", () => {
    assert.equal(render("**推断：**这里"), "<p><strong>推断：</strong>这里</p>")
    assert.equal(render("**没有统一胜者。**支持"), "<p><strong>没有统一胜者。</strong>支持</p>")
    assert.equal(render("这是**【近三个月】**的资料"), "<p>这是<strong>【近三个月】</strong>的资料</p>")
    assert.equal(render("*斜体。*后接中文"), "<p><em>斜体。</em>后接中文</p>")
    assert.equal(render("**Implication。**evidence"), "<p><strong>Implication。</strong>evidence</p>")
})

test("nested emphasis and links remain structured", () => {
    assert.equal(render("**含有 *嵌套。* 和 [链接](https://example.com) 的重点。**继续"),
        '<p><strong>含有 <em>嵌套。</em> 和 <a href="https://example.com">链接</a> 的重点。</strong>继续</p>')
    assert.equal(render("***强调。***继续"), "<p><em><strong>强调。</strong></em>继续</p>")
})

test("emphasis works inside headings, blockquotes, lists, and GFM tables", () => {
    const html = render("## **标题。**继续\n\n> **引用：**内容\n\n- *项目。*内容\n\n| 项目 |\n| --- |\n| **说明：**内容 |")
    for (const word of ["标题。", "引用：", "说明："]) assert.ok(html.includes(`<strong>${word}</strong>`))
    assert.ok(html.includes("<em>项目。</em>"))
    assert.ok(html.includes("<table>"))
})

test("code, math, escaped/literal stars and ordinary Markdown are unchanged", () => {
    const baseline = markdownPlugins.slice(0, 2)
    const sources = [
        "`**推断：**原样`", "```mermaid\ngraph LR\nA[**推断：**原样]\n```",
        "~~~text\n**推断：**原样\n~~~", "    **推断：**原样",
        String.raw`\*\*推断：\*\*原样`, "&#42;&#42;推断：&#42;&#42;原样",
        "$a * b ** c$", "$$\na * b ** c\n$$", "不成对 * 星号 ** 保留",
        "2 * 3 = 6", "a_b_c", "**bold** and *italic* and ***both***",
        "** bold **", "* item\n* next", "---", "~~removed~~",
        '<span title="**推断：**">plain</span>',
    ]
    for (const source of sources) assert.equal(render(source), render(source, baseline), source)
})
