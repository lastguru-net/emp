# Eleventy Markdown Prime starter repository by lastguru

Eleventy Markdown Prime is a minimalistic, opinionated starter for text-first blogs built with Eleventy 4 and Tailwind CSS 4. It is loosely based on [Eleventy Chirpy Blog Template](https://github.com/muenzpraeger/eleventy-chirpy-blog-template), inspired by the popular [Chirpy Jekyll Theme](https://github.com/cotes2020/jekyll-theme-chirpy). It strives to be fast, accessible, and easy to customize.

## [Current live demo](https://emp-starter.lastguru.dev)

![Sample screenshot](/content/images/sample.png)

## Current features

- Eleventy 4 theme with Tailwind CSS 4
- Fast and minimalistic responsive design
- Simple grayscale color palette with a configurable accent color
- Light and dark modes with an optional toggle
- Content is exclusively pre-rendered (static site), but supports supplemental JavaScript
- Can be used for a text-based (Markdown) blog or simple page
- Optional fulltext in-memory search with MiniSearch
- Logo, site name and main menu are placed on the left sidebar
- Social network links on the sidebar or in the footer
- Automatic post list (index), tag and author pages with pagination and post pinning
- Optional post thumbnails in post lists
- Author business cards on author pages (photo, bio, links)
- Footer component with copyright/privacy information
- Can be easily localized
- Convenient configuration with many options
- Automatic responsive image optimization (generating AVIF and WEBP with different sizes)
- Optional LQIP generation
- Comprehensive JSON-LD structured data support
- SEO optimization, OpenGraph and Twitter Cards
- RSS, Atom and JSON feeds
- Special pages: Error 404, robots.txt, sitemap.xml
- Web app manifest and generated app icons

## Installation

Node.js 24 or newer is required.

```
npm install
```

## Local testing

```
npm run build
```

## Running in production

Set `NODE_ENV=production` when building for deployment to minify HTML, feeds and JavaScript. CSS is minified in all builds.

## Additional info

More info on running, modifying and configuring the template is available on its demo page: [Eleventy Markdown Prime Demo](https://emp-starter.lastguru.dev).
