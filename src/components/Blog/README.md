# Blog System Documentation

## Overview
The blog system is fully set up and production-ready. It automatically displays all posts on the `/blog` page and handles individual post pages at `/blog/:slug`.

## File Structure
```
Blog/
├── BlogList.jsx       # Main blog listing page (displays all posts)
├── BlogPost.jsx       # Individual post viewer (displays single post)
├── Blog.css           # All styling for blog pages
├── Post 1.jsx         # Blog post: A Chiropractor's Guide to Understanding AI
├── Post 2.jsx         # Blog post: Top 3 Automations for a Chiropractic Practice
├── Post 3.jsx         # Blog post: Top 3 AI SOAP Note Tools for Chiropractors
└── README.md          # This file
```

## How to Add a New Blog Post

### Step 1: Create the Post File
Create a new file: `Post X.jsx` (replace X with post number)

Use this template:
```jsx
import React from 'react';

// Post metadata
const metadata = {
  title: "Your Post Title Here",
  synopsis: "A brief 1-2 sentence description that appears on the blog listing page.",
  slug: 'your-post-url-slug',  // This will be the URL: /blog/your-post-url-slug
};

// Post content component
function PostXContent() {
  return (
    <div>
      <p>Your content goes here...</p>
      
      <h2>Section Heading</h2>
      <p>More content...</p>
      
      <h3>Subsection</h3>
      <ul>
        <li>Bullet point 1</li>
        <li>Bullet point 2</li>
      </ul>
    </div>
  );
}

// Export with metadata and component
export default {
  ...metadata,
  component: PostXContent,
};
```

### Step 2: Register the Post in BlogList.jsx
Open `BlogList.jsx` and:

1. Import your new post:
```jsx
import Post2 from './Post 2';
```

2. Add it to the BLOG_POSTS array:
```jsx
const BLOG_POSTS = [
  Post1,
  Post2,  // Add your new post here
  // Post3,
];
```

### Step 3: Register the Post in BlogPost.jsx
Open `BlogPost.jsx` and:

1. Import your new post:
```jsx
import Post2 from './Post 2';
```

2. Add it to the POST_MAP:
```jsx
const POST_MAP = {
  [Post1.slug]: Post1,
  [Post2.slug]: Post2,  // Add your new post here
};
```

### Step 4: Done!
Your new post will automatically appear on the blog listing page and be accessible at its unique URL.

## Available Styling

The blog system supports these HTML elements (styled automatically in Blog.css):

- `<p>` - Paragraphs (18px, comfortable line-height)
- `<h2>` - Major section headings (32px, bold)
- `<h3>` - Subsection headings (24px, green color)
- `<ul>` / `<ol>` - Bulleted and numbered lists
- `<li>` - List items (auto-styled with spacing)
- `<a>` - Links (green color with hover effect)
- `<blockquote>` - Quoted text (left border, italic)
- `<img>` - Images (auto-responsive, rounded corners)
- `<strong>` / `<b>` - Bold text
- `<em>` / `<i>` - Italic text

## Navigation

The blog is accessible from all 3 landing pages:
- Desktop: "Blog" link in header (left of "Video")
- Mobile: "Blog" at top of mobile menu

Main routes:
- `/blog` - Blog listing page
- `/blog/:slug` - Individual post pages
- Back button returns to `/blog`
- Logo click returns to landing page (`/`)

## Design Notes

- Matches your existing landing page design system
- Clean, professional layout with bold borders
- Fully responsive (desktop, tablet, mobile)
- Hover effects on post cards
- Professional typography and spacing

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'slug')"

**Cause:** This error occurs when the post file's export statement is malformed or missing the semicolon.

**Solution:** Ensure your post file ends with a proper export statement:

```jsx
// Export with metadata and component
export default {
  ...metadata,
  component: PostXContent,
};
```

**Common mistakes:**
- Missing semicolon at the end of the export statement
- Extra blank lines or whitespace after the export
- Typo in the component name (e.g., `Post3Content` vs `PostXContent`)
- Missing or incomplete metadata object

**How to verify:**
1. Check that the export statement has a semicolon
2. Ensure no extra blank lines after the export
3. Verify the component name matches the function name
4. Confirm metadata has `title`, `synopsis`, and `slug` fields
