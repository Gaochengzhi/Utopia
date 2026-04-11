import MarkdownArticle from "/components/MarkdownArticle"
import Head from "next/head"

const testContent = `
# Mermaid Diagram Test Page

## Flowchart

\`\`\`mermaid
graph TD
    A[🚀 Start] --> B{Is it working?}
    B -->|Yes| C[🎉 Celebrate]
    B -->|No| D[🔍 Debug]
    D --> E[Fix the bug]
    E --> B
    C --> F[✅ Ship it!]
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant U as 👤 User
    participant B as 🌐 Browser
    participant S as ⚡ Server
    participant D as 🗄️ Database

    U->>B: Visit blog post
    B->>S: GET /post/article.md
    S->>D: Query content
    D-->>S: Markdown + Mermaid
    S-->>B: Rendered HTML
    B-->>U: Beautiful diagrams!
\`\`\`

## State Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: fetch
    Loading --> Rendering: data received
    Loading --> Error: timeout
    Rendering --> Rendered: SVG ready
    Error --> Idle: retry
    Rendered --> [*]
\`\`\`

## Regular Code Block (should still work)

\`\`\`python
def hello():
    print("Mermaid support added!")
\`\`\`

## Inline math still works: $E = mc^2$
`

export default function TestMermaid() {
    return (
        <>
            <Head>
                <title>Mermaid Test</title>
            </Head>
            <div className="max-w-4xl mx-auto py-20 px-4 bg-white dark:bg-gray-900 min-h-screen">
                <MarkdownArticle content={testContent} />
            </div>
        </>
    )
}
