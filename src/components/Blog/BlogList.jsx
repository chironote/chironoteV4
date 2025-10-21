import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Blog.css';
import LandingNavbar from '../LandingNavbar/LandingNavbar';

// Import all blog posts here
// Each post should export: { title, synopsis, slug, component }
import Post1 from './Post 1';
import Post2 from './Post 2';

// Array of all blog posts - add new posts here
const BLOG_POSTS = [
  Post1,
  Post2,
  // Add more posts here as you create them:
  // Post3,
];

export default function BlogList() {
  const navigate = useNavigate();

  const handlePostClick = (slug) => {
    navigate(`/blog/${slug}`);
  };

  return (
    <div className="blog-list">
      <LandingNavbar />
      
      <div className="blog-list__content">
        <div className="blog-list__header">
          <h1 className="blog-list__title">ChiroNote Blog</h1>
          <p className="blog-list__subtitle">Insights on AI, chiropractic practice management, and healthcare technology</p>
        </div>

        <div className="blog-list__posts">
          {BLOG_POSTS.map((post, index) => (
            <div 
              key={index} 
              className="blog-post-card"
              onClick={() => handlePostClick(post.slug)}
            >
              <h2 className="blog-post-card__title">{post.title}</h2>
              <p className="blog-post-card__synopsis">{post.synopsis}</p>
              <span className="blog-post-card__read-more">Read More →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
