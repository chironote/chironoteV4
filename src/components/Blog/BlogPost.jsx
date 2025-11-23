import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './Blog.css';
import LandingNavbar from '../LandingNavbar/LandingNavbar';

// Import all blog posts
import Post1 from './Post 1';
import Post2 from './Post 2';
import Post3 from './Post 3';
import Post4 from './Post 4';

// Map slugs to post components
const POST_MAP = {
  [Post1.slug]: Post1,
  [Post2.slug]: Post2,
  [Post3.slug]: Post3,
  [Post4.slug]: Post4,
  // Add more posts here as you create them
};

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = POST_MAP[slug];

  const handleBackClick = () => {
    navigate('/blog');
  };

  if (!post) {
    return (
      <div className="blog-post">
        <Helmet>
          <title>Post Not Found | ChiroNote</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <LandingNavbar />
        <div className="blog-post__container">
          <div className="blog-post__header">
            <button onClick={handleBackClick} className="blog-post__back-button">
              ← Back to Blog
            </button>
          </div>
          <div className="blog-post__content">
            <h1>Post not found</h1>
            <p>The blog post you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const PostComponent = post.component;
  const postUrl = `https://chironote.com/blog/${slug}`;

  return (
    <div className="blog-post">
      <Helmet>
        <title>{post.title} | ChiroNote Blog</title>
        <meta name="description" content={post.synopsis} />
        <link rel="canonical" href={postUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={postUrl} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.synopsis} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={postUrl} />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.synopsis} />
        
        {/* Article Metadata */}
        <meta property="article:site_name" content="ChiroNote" />
      </Helmet>
      <LandingNavbar />
      <div className="blog-post__container">
        <div className="blog-post__header">
          <button onClick={handleBackClick} className="blog-post__back-button">
            ← Back to Blog
          </button>
        </div>
        <div className="blog-post__content">
          <h1 className="blog-post__title">{post.title}</h1>
          <PostComponent />
        </div>
      </div>
    </div>
  );
}
