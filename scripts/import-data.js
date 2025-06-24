const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function establishRelationships() {
  try {
    // Read the data files
    const placesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'places.json'), 'utf8'));
    const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'categories.json'), 'utf8'));

    console.log('Starting to establish relationships...');

    // Create a map of category slugs to category IDs
    const categorySlugToId = new Map();
    console.log('Fetching categories...');
    const categoriesResponse = await axios.get('http://127.0.0.1:1337/api/categories');
    for (const category of categoriesResponse.data.data) {
      categorySlugToId.set(category.attributes.slug, category.id);
    }

    // Create a map of place slugs to place IDs
    const placeSlugToId = new Map();
    console.log('Fetching places...');
    const placesResponse = await axios.get('http://127.0.0.1:1337/api/places');
    for (const place of placesResponse.data.data) {
      placeSlugToId.set(place.attributes.slug, place.id);
    }

    // Update categories with their places
    console.log('Updating categories with places...');
    for (const category of categoriesData) {
      try {
        const categoryId = categorySlugToId.get(category.slug);
        if (!categoryId) {
          console.log(`⚠️ Category "${category.name}" not found in database`);
          continue;
        }

        // Get place IDs for this category
        const placeIds = [];
        for (const placeSlug of category.places || []) {
          const place = placeSlugToId.get(placeSlug);
          if (!place) {
            console.warn(`⚠️  Place with slug '${placeSlug}' not found for category '${category.slug}'.`);
            continue;
          }
          placeIds.push(place);
        }

        if (placeIds.length === 0) {
          console.log(`⚠️ No valid places found for category "${category.name}"`);
          continue;
        }

        // Update the category with its places
        await axios.put(`http://127.0.0.1:1337/api/categories/${categoryId}`, {
          data: {
            places: placeIds
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log(`✓ Category "${category.name}" updated with ${placeIds.length} places`);
      } catch (error) {
        console.log(`✗ Failed to update category "${category.name}": ${error.response?.data?.error?.message || error.message}`);
      }
    }

    // Update places with their categories
    console.log('Updating places with categories...');
    for (const place of placesData) {
      try {
        const placeId = placeSlugToId.get(place.slug);
        if (!placeId) {
          console.log(`⚠️ Place "${place.name}" not found in database`);
          continue;
        }

        // Get category IDs for this place
        const categoryIds = [];
        for (const categorySlug of place.categories || []) {
          const categoryId = categorySlugToId.get(categorySlug);
          if (!categoryId) {
            console.warn(`⚠️  Category with slug '${categorySlug}' not found for place '${place.slug}'.`);
            continue;
          }
          categoryIds.push(categoryId);
        }

        if (categoryIds.length === 0) {
          console.log(`⚠️ No valid categories found for place "${place.name}"`);
          continue;
        }

        // Update the place with its categories
        await axios.put(`http://127.0.0.1:1337/api/places/${placeId}`, {
          data: {
            categories: categoryIds
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log(`✓ Place "${place.name}" updated with ${categoryIds.length} categories`);
      } catch (error) {
        console.log(`✗ Failed to update place "${place.name}": ${error.response?.data?.error?.message || error.message}`);
      }
    }

    console.log('Relationships established successfully!');
  } catch (error) {
    console.error('Error during relationship establishment:', error);
  }
}

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

    // Finally, establish relationships
    await establishRelationships();

    console.log('Data import completed!');
  } catch (error) {
    console.error('Error during import:', error);
  }
}

// Run the import
importData(); 