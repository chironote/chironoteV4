---
type: component-readme
title: "Blog Components"
description: "Public blog component structure, content conventions, and maintenance guidance."
resource: "../../src/components/Blog/README.md"
tags: [chironote, component, blog]
---


> Source: [`README.md`](../../src/components/Blog/README.md)

# Blog Components

This folder owns the public blog index and individual blog post route rendering.

## Files

- `BlogList.jsx` renders `/blog`, imports all post modules, and displays post cards.
- `BlogPost.jsx` renders `/blog/:slug`, finds a post by slug, and renders its component.
- `Post 1.jsx` through `Post 5.jsx` are individual blog modules.
- `Blog.css` styles the blog list and article pages.

## Post Module Contract

Each post file should export an object with this shape:

```js
export default {
  title: 'Post title',
  synopsis: 'Short SEO and card summary',
  slug: 'url-safe-slug',
  component: PostXContent
};
```

`BlogList` imports every post and places it in `BLOG_POSTS`:

```js
const BLOG_POSTS = [
  Post1,
  Post2,
  Post3,
  Post4,
  Post5,
];
```

`BlogPost` mirrors that list in `POST_MAP`:

```js
const POST_MAP = {
  [Post1.slug]: Post1,
  [Post2.slug]: Post2,
  [Post3.slug]: Post3,
  [Post4.slug]: Post4,
  [Post5.slug]: Post5,
};
```

## Maintenance Notes

- When adding a post, update both `BLOG_POSTS` in `BlogList.jsx` and `POST_MAP` in `BlogPost.jsx`.
- Each route uses `Helmet` for canonical URLs, description metadata, Open Graph tags, and Twitter tags.
- The file names currently include spaces. Follow the existing import style unless you are doing a deliberate cleanup.

## Provenance

Derived from [`README.md`](../../src/components/Blog/README.md).

