// Post-build script to defer CSS loading for better performance
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build');
const indexPath = path.join(buildDir, 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Find and defer main CSS file
  html = html.replace(
    /<link\s+href="([^"]*\.css)"\s+rel="stylesheet">/g,
    '<link href="$1" rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">\n  <noscript><link href="$1" rel="stylesheet"></noscript>'
  );
  
  fs.writeFileSync(indexPath, html);
  console.log('✅ CSS deferred successfully in build/index.html');
} else {
  console.log('⚠️  build/index.html not found - skipping CSS deferral');
}
