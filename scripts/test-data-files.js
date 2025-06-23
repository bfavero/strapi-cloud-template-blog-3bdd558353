const fs = require('fs');
const path = require('path');

try {
  console.log('Testing data files...');
  
  // Test places file
  const placesPath = path.join(__dirname, '..', 'data', 'places.json');
  console.log('Places file path:', placesPath);
  console.log('Places file exists:', fs.existsSync(placesPath));
  
  if (fs.existsSync(placesPath)) {
    const placesData = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
    console.log('Places data parsed successfully. Count:', placesData.length);
    console.log('First place:', placesData[0]?.name);
  }
  
  // Test categories file
  const categoriesPath = path.join(__dirname, '..', 'data', 'categories.json');
  console.log('Categories file path:', categoriesPath);
  console.log('Categories file exists:', fs.existsSync(categoriesPath));
  
  if (fs.existsSync(categoriesPath)) {
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
    console.log('Categories data parsed successfully. Count:', categoriesData.length);
    console.log('First category:', categoriesData[0]?.name);
  }
  
} catch (error) {
  console.error('Error testing data files:', error);
} 