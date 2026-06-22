const fs = require('fs');
const path = require('path');

const pwa_tags = `  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#0f172a">
  <link rel="apple-touch-icon" href="/icon.svg">
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  </script>`;

const viewsDir = 'src/public/views';
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const file = path.join(viewsDir, f);
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('<link rel="manifest"')) {
    content = content.replace('</head>', pwa_tags + '\n</head>');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
