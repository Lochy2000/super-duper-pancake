const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

// Directories to clean
const directories = [
  '.next',
  'node_modules/.cache'
];

async function cleanNextCache() {
  console.log('Cleaning Next.js cache...');
  
  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    
    try {
      console.log(`Removing ${dirPath}...`);
      // Using rimraf with callback instead of promisify
      rimraf(dirPath, (error) => {
        if (error) {
          console.error(`Error removing ${dir}:`, error.message);
        } else {
          console.log(`Successfully removed ${dir}`);
        }
      });
    } catch (error) {
      console.error(`Error removing ${dir}:`, error.message);
    }
  }
  
  console.log('Cache cleaning initiated. Please wait a moment for completion.');
}

cleanNextCache();
