import MarkdownArticle from "/components/MarkdownArticle"
import Head from "next/head"
import Navbar from "/components/Navbar"
import { Toc, MobileToc } from "/components/Toc"

const testContent = `
# Reading theme preview

暖纸色背景与深棕灰文字，让长文阅读更自然。这里是一段中英文混排的示例，便于检查阅读宽度、正文密度与图表文字。

> 引用、**重点**和 [链接](https://gaochengzhi.com) 应当清楚可读。

## 中文强调兼容

**推断：**这里应该加粗。**没有统一胜者。**后接正文。

这是**【近三个月】**的资料；*斜体。*后接中文；**含有 *嵌套。* 和 [链接](https://gaochengzhi.com) 的重点。**继续正文。

代码里的星号保持原样：\`**推断：**原样\`；转义星号也保留：\\*\\*字面量\\*\\*。

## Timeline

\`\`\`mermaid
timeline
    title Reading and writing
    2023-09 : Collect sources : Keep the original context
    2024-03 : Compare ideas : Identify useful differences
    2024-05 : Build a model : Make assumptions visible
    2024-06 : Try examples : Check the difficult cases
    2025-03 : Revise : Improve the explanation
    2025-07 : Discuss : Learn from feedback
    2025-12 : Connect : Link related ideas
    2026-01 : Write : Make the reasoning readable
    2026-08 : Publish : Share the finished work
\`\`\`

## Flowchart

\`\`\`mermaid
flowchart LR
    A[整理思路] --> B{建立联系}
    B -->|继续| C[形成文章]
    B -->|修改| D[重新思考]
    style A fill:#222,color:#222
\`\`\`

## Sequence diagram

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant U as Reader
    participant B as Blog
    U->>B: Open an article
    Note over U,B: Clear labels on light surfaces
    B-->>U: Display content
\`\`\`

## State diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: fetch
    Loading --> Ready: success
    Loading --> Error: timeout
    Error --> Idle: retry
    Ready --> [*]
\`\`\`

## Code and math

\`inline code\` and $E = mc^2$.

\`\`\`python
# Read, reflect, write
def hello():
    count = 3
    print("Warm paper")
\`\`\`

## Pie chart

\`\`\`mermaid
pie title Time for ideas
    "Reading" : 35
    "Writing" : 30
    "Discussion" : 20
    "Revision" : 15
\`\`\`

## Gantt chart

\`\`\`mermaid
gantt
    title A small writing project
    dateFormat YYYY-MM-DD
    section Draft
    Read sources :done, read, 2026-09-01, 3d
    Write draft :active, draft, after read, 4d
    Review :crit, review, after draft, 2d
\`\`\`

## Mindmap

\`\`\`mermaid
mindmap
  root((Reading))
    Sources
      Papers
      Notes
    Questions
      Evidence
      Assumptions
    Writing
      Draft
      Review
\`\`\`

## Table

| Area | Surface | Text |
| --- | --- | --- |
| Article | Warm paper | Brown gray |
| Diagram | Sand, sage, blue gray | Dark ink |
| Code | Pale cream | Muted syntax colors |
`

export default function TestMermaid() {
    return (
        <>
            <Head>
                <title>Reading Theme Preview</title>
                <meta name="robots" content="noindex" />
            </Head>
            <Navbar />
            <div className="main article-layout bg-paper min-h-screen">
                <div className="hidden lg:block flex-shrink-0">
                    <Toc content={testContent} />
                </div>
                <div className="article-column">
                    <MarkdownArticle content={testContent} />
                </div>
            </div>
            <div className="lg:hidden"><MobileToc content={testContent} /></div>
        </>
    )
}
