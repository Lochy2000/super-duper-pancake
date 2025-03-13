const fs = require('fs');
const path = require('path');

// Directories to clean
const directories = [
  '.next',
  'node_modules/.cache'
];

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log(`Deleted ${folderPath} successfully`);
  } else {
    console.log(`Directory not found: ${folderPath}`);
  }
}

// Main function to clean cache
function cleanCache() {
  console.log('Starting cache cleanup...');
  
  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    console.log(`Cleaning: ${fullPath}`);
    deleteFolderRecursive(fullPath);
  });
  
  console.log('Cache cleaning complete!');
}

cleanCache();
