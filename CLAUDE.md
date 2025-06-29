# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Utopia" - a Next.js-based personal blog and photography portfolio with the following architecture:

- **Next.js 12.2.4** with React 18.2.0 using pages router
- **File-based content system** where markdown files in `post/` directory drive the blog content
- **Photography portfolio** with images in `public/photography/content/` organized by categories
- **Static site generation** with incremental regeneration (ISR) for performance
- **Dual routing system**: blog posts via `[...slug].js` and photography via dedicated routes

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server (runs on port 8888)
npm start

# Linting
npm run lint

# Bundle analysis
npm run analyze
npm run analyze:server  # Server bundle
npm run analyze:browser # Browser bundle
```

## Core Architecture

### Content Management System
- **Blog posts**: Stored as markdown files in nested directories under `post/`
- **File tree generation**: `readAllFile()` utility recursively scans directories and generates navigation trees
- **Dynamic routing**: `[...slug].js` handles all blog post routes by mapping file paths to URLs
- **Content processing**: Uses `gray-matter` for frontmatter parsing and path-based content loading

### Photography System
- **Image organization**: Categories stored in `public/photography/content/{Category}/`
- **Gallery generation**: Automatically scans image directories to build photo galleries
- **Image viewer**: Uses `react-photo-view` for lightbox functionality
- **Responsive layout**: Custom components for different photography layouts

### Static Generation Strategy
- **Home page**: Shows latest 3 posts with full content preview + list of all posts
- **Blog posts**: Generated from markdown files with syntax highlighting and math rendering
- **Photography pages**: Generated from filesystem scans of image directories
- **ISR revalidation**: Set to 1 second for near real-time updates

### Key Utilities
- `readAllFile()`: Core utility that scans directories and builds file trees with timestamps
- `tree2list()` and `treeSort`: Transform directory trees into sortable lists
- Path replacement logic for image URLs (development vs production)

### Markdown Processing
- **Syntax highlighting**: Uses `react-syntax-highlighter` with VS Code Dark+ theme
- **Math rendering**: KaTeX integration via `remark-math` and `rehype-katex`
- **GitHub Flavored Markdown**: Support for tables, strikethrough, etc.
- **Raw HTML**: Enabled through `rehype-raw`

### Component Structure
- **Layout components**: Navbar, Footer, Float (TOC toggle)
- **Content components**: PostList, FileTree, Info
- **Photography components**: Banner, Wall, CataContainer, Pnav
- **Utility components**: SearchBar, TOC, SlugToc

## Development Notes

### Image Handling
- Images are automatically compressed via `imgUpload.sh` script
- Development images reference local paths that get replaced with production URLs during build
- Photography images are organized by category and auto-discovered

### Cookie-Based Refresh System
The app uses a cookie-based system to handle refresh scenarios across different page types (`refreshed`, `refreshed_slug`, `refreshedP`).

### Search Functionality
- **Backend API**: `/api/search` endpoint handles full-text search across markdown files
- **Security features**: Input validation, character filtering, result limiting
- **Search method**: Uses grep with safety constraints (timeout, max results)
- **Frontend**: Real-time search with highlighted results and error handling

### Styling Approach
- **Tailwind CSS** for utility-first styling
- **Ant Design** components for UI elements
- **GitHub Markdown CSS** for content styling
- Custom CSS classes for photography layout (`bg-black` theme)