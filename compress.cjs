const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectsDir = path.join(__dirname, 'public/projects');
const projectsFile = path.join(__dirname, 'src/data/projects.ts');

async function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      await processDirectory(fullPath);
    } else if (/\.(png|jpe?g)$/i.test(file) && !file.includes('-webgl.')) {
      const parsed = path.parse(fullPath);
      const webpPath = path.join(parsed.dir, `${parsed.name}-webgl.webp`);
      
      // Check if it already exists to skip
      if (!fs.existsSync(webpPath)) {
        console.log(`Compressing: ${file}`);
        try {
          await sharp(fullPath, { limitInputPixels: false })
            .resize({
              width: 1024,
              height: 1024,
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toFile(webpPath);
        } catch (e) {
          console.error(`Error compressing ${file}:`, e);
        }
      }
    }
  }
}

async function run() {
  console.log('Starting image compression...');
  await processDirectory(projectsDir);
  console.log('Compression complete.');

  console.log('Updating projects.ts...');
  let content = fs.readFileSync(projectsFile, 'utf8');

  // Regex to find previews: [...]
  // We want to add fullResPreviews: [...] right above it, and modify the previews to use -webgl.webp
  
  content = content.replace(/previews:\s*\[(.*?)\]/g, (match, arrayContent) => {
    // If it's a youtube link or mp4, skip
    if (arrayContent.includes('youtube') || arrayContent.includes('.mp4')) {
      return match;
    }
    
    // We already processed this if fullResPreviews exists, but let's just do a blanket replace.
    // Parse the array
    const originalPaths = arrayContent.match(/"([^"]+)"/g) || [];
    
    const webpPaths = originalPaths.map(p => {
      // p is "/projects/file.png"
      if (/\.(png|jpe?g)$/i.test(p)) {
        return p.replace(/\.(png|jpe?g)$/i, '-webgl.webp');
      }
      return p;
    });

    return `fullResPreviews: [${originalPaths.join(', ')}],\n        previews: [${webpPaths.join(', ')}]`;
  });

  fs.writeFileSync(projectsFile, content, 'utf8');
  console.log('projects.ts updated.');
}

run();
