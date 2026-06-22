import os
import glob

# Injection strings
pwa_tags = """  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#0f172a">
  <link rel="apple-touch-icon" href="/icon.svg">
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  </script>"""

views = glob.glob('/src/public/views/*.html')
for view in views:
    with open(view, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '<link rel="manifest"' not in content:
        # insert before </head>
        content = content.replace('</head>', f'{pwa_tags}\n</head>')
        
        with open(view, 'w', encoding='utf-8') as f:
            f.write(content)
            print(f"Updated {view}")
