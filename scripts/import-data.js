const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function importData() {
  try {
    // Read the data files
    const placesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'places.json'), 'utf8'));
    const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'categories.json'), 'utf8'));

    console.log('Starting data import...');

    // First, import categories
    console.log('Importing categories...');
    for (const category of categoriesData) {
      try {
        // Remove the places array for now (we'll handle relationships later)
        const { places, ...categoryData } = category;
        
        const response = await axios.post('http://127.0.0.1:1337/api/categories', {
          data: categoryData
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log(`✓ Category "${category.name}" imported successfully`);
      } catch (error) {
        console.log(`✗ Failed to import category "${category.name}": ${error.response?.data?.error?.message || error.message}`);
      }
    }

    // Then, import places
    console.log('Importing places...');
    for (const place of placesData) {
      try {
        // Remove the categories array for now (we'll handle relationships later)
        const { categories, ...placeData } = place;
        
        const response = await axios.post('http://127.0.0.1:1337/api/places', {
          data: placeData
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log(`✓ Place "${place.name}" imported successfully`);
      } catch (error) {
        console.log(`✗ Failed to import place "${place.name}": ${error.response?.data?.error?.message || error.message}`);
      }
    }

    console.log('Data import completed!');
  } catch (error) {
    console.error('Error during import:', error);
  }
}

// Run the import
importData(); 