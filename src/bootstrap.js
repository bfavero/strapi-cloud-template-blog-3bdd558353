'use strict';

const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
// const { categories, authors, articles, global, about } = require('../data/data.json'); // DISABLED: Auto-import disabled

async function seedExampleApp() {
  const shouldImportSeedData = await isFirstRun();

  if (shouldImportSeedData) {
    try {
      console.log('Setting up the template...');
      await importSeedData();
      console.log('Ready to go');
    } catch (error) {
      console.log('Could not import seed data');
      console.error(error);
    }
  } else {
    console.log(
      'Seed data has already been imported. We cannot reimport unless you clear your database first.'
    );
  }
}

async function isFirstRun() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });
  const initHasRun = await pluginStore.get({ key: 'initHasRun' });
  await pluginStore.set({ key: 'initHasRun', value: true });
  return !initHasRun;
}

async function setPublicPermissions(newPermissions) {
  // Find the ID of the public role
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: {
      type: 'public',
    },
  });

  // Create the new permissions and link them to the public role
  const allPermissionsToCreate = [];
  Object.keys(newPermissions).map((controller) => {
    const actions = newPermissions[controller];
    const permissionsToCreate = actions.map((action) => {
      return strapi.query('plugin::users-permissions.permission').create({
        data: {
          action: `api::${controller}.${controller}.${action}`,
          role: publicRole.id,
        },
      });
    });
    allPermissionsToCreate.push(...permissionsToCreate);
  });
  await Promise.all(allPermissionsToCreate);
}

function getFileSizeInBytes(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats['size'];
  return fileSizeInBytes;
}

function getFileData(fileName) {
  const filePath = path.join('data', 'uploads', fileName);
  // Parse the file metadata
  const size = getFileSizeInBytes(filePath);
  const ext = fileName.split('.').pop();
  const mimeType = mime.lookup(ext || '') || '';

  return {
    filepath: filePath,
    originalFileName: fileName,
    size,
    mimetype: mimeType,
  };
}

async function uploadFile(file, name) {
  return strapi
    .plugin('upload')
    .service('upload')
    .upload({
      files: file,
      data: {
        fileInfo: {
          alternativeText: `An image uploaded to Strapi called ${name}`,
          caption: name,
          name,
        },
      },
    });
}

// Create an entry and attach files if there are any
async function createEntry({ model, entry }) {
  try {
    // Actually create the entry in Strapi
    await strapi.documents(`api::${model}.${model}`).create({
      data: entry,
    });
  } catch (error) {
    console.error({ model, entry, error });
  }
}

async function checkFileExistsBeforeUpload(files) {
  const existingFiles = [];
  const uploadedFiles = [];
  const filesCopy = [...files];

  for (const fileName of filesCopy) {
    // Check if the file already exists in Strapi
    const fileWhereName = await strapi.query('plugin::upload.file').findOne({
      where: {
        name: fileName.replace(/\..*$/, ''),
      },
    });

    if (fileWhereName) {
      // File exists, don't upload it
      existingFiles.push(fileWhereName);
    } else {
      // File doesn't exist, upload it
      const fileData = getFileData(fileName);
      const fileNameNoExtension = fileName.split('.').shift();
      const [file] = await uploadFile(fileData, fileNameNoExtension);
      uploadedFiles.push(file);
    }
  }
  const allFiles = [...existingFiles, ...uploadedFiles];
  // If only one file then return only that file
  return allFiles.length === 1 ? allFiles[0] : allFiles;
}

async function updateBlocks(blocks) {
  const updatedBlocks = [];
  for (const block of blocks) {
    if (block.__component === 'shared.media') {
      const uploadedFiles = await checkFileExistsBeforeUpload([block.file]);
      // Copy the block to not mutate directly
      const blockCopy = { ...block };
      // Replace the file name on the block with the actual file
      blockCopy.file = uploadedFiles;
      updatedBlocks.push(blockCopy);
    } else if (block.__component === 'shared.slider') {
      // Get files already uploaded to Strapi or upload new files
      const existingAndUploadedFiles = await checkFileExistsBeforeUpload(block.files);
      // Copy the block to not mutate directly
      const blockCopy = { ...block };
      // Replace the file names on the block with the actual files
      blockCopy.files = existingAndUploadedFiles;
      // Push the updated block
      updatedBlocks.push(blockCopy);
    } else {
      // Just push the block as is
      updatedBlocks.push(block);
    }
  }

  return updatedBlocks;
}

// async function importArticles() {
//   for (const article of articles) {
//     const cover = await checkFileExistsBeforeUpload([`${article.slug}.jpg`]);
//     const updatedBlocks = await updateBlocks(article.blocks);

//     await createEntry({
//       model: 'article',
//       entry: {
//         ...article,
//         cover,
//         blocks: updatedBlocks,
//         // Make sure it's not a draft
//         publishedAt: Date.now(),
//       },
//     });
//   }
// }

// async function importGlobal() {
//   const favicon = await checkFileExistsBeforeUpload(['favicon.png']);
//   const shareImage = await checkFileExistsBeforeUpload(['default-image.png']);
//   return createEntry({
//     model: 'global',
//     entry: {
//       ...global,
//       favicon,
//       // Make sure it's not a draft
//       publishedAt: Date.now(),
//       defaultSeo: {
//         ...global.defaultSeo,
//         shareImage,
//       },
//     },
//   });
// }

// async function importAbout() {
//   const cover = await checkFileExistsBeforeUpload([`${about.slug}.jpg`]);
//   const updatedBlocks = await updateBlocks(about.blocks);

//   await createEntry({
//     model: 'about',
//     entry: {
//       ...about,
//       cover,
//       blocks: updatedBlocks,
//       // Make sure it's not a draft
//       publishedAt: Date.now(),
//     },
//   });
// }

// async function importCategories() {
//   for (const category of categories) {
//     await createEntry({
//       model: 'category',
//       entry: category,
//     });
//   }
// }

// async function importAuthors() {
//   for (const author of authors) {
//     const avatar = await checkFileExistsBeforeUpload([`${author.slug}.jpg`]);
//     await createEntry({
//       model: 'author',
//       entry: {
//         ...author,
//         avatar,
//       },
//     });
//   }
// }

async function importSeedData() {
  // Allow read of application content types
  await setPublicPermissions({
    article: ['find', 'findOne'],
    category: ['find', 'findOne'],
    author: ['find', 'findOne'],
    global: ['find', 'findOne'],
    about: ['find', 'findOne'],
    place: ['find', 'findOne'],
  });

  // Create all entries
  // await importCategories();
  // await importAuthors();
  // await importArticles();
  // await importGlobal();
  // await importAbout();
}

async function shouldImportCustomData() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });
  const customDataHasRun = await pluginStore.get({ key: 'customDataHasRun' });
  await pluginStore.set({ key: 'customDataHasRun', value: true });
  return !customDataHasRun;
}

async function importCustomData() {
  const shouldImport = await shouldImportCustomData();
  
  if (shouldImport) {
    try {
      console.log('Importing custom places and categories...');
      
      // Set permissions for places content type
      await setPublicPermissions({
        place: ['find', 'findOne'],
      });
      
      // Read the custom data files
      const placesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'places.json'), 'utf8'));
      const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'categories.json'), 'utf8'));

      // First, upsert categories and store them for reference
      console.log('Upserting custom categories...');
      const categoryMap = new Map(); // slug -> category id
      
      for (const category of categoriesData) {
        try {
          // Check if category exists by slug
          const existingCategory = await strapi.entityService.findMany('api::category.category', {
            filters: { slug: category.slug }
          });
          
          let categoryId;
          if (existingCategory && existingCategory.length > 0) {
            // Update existing category
            const updatedCategory = await strapi.entityService.update('api::category.category', existingCategory[0].id, {
              data: {
                name: category.name,
                slug: category.slug,
                description: category.description
              }
            });
            categoryId = updatedCategory.id;
            console.log(`✓ Category "${category.name}" updated successfully`);
          } else {
            // Create new category
            const newCategory = await strapi.entityService.create('api::category.category', {
              data: {
                name: category.name,
                slug: category.slug,
                description: category.description
              }
            });
            categoryId = newCategory.id;
            console.log(`✓ Category "${category.name}" created successfully`);
          }
          
          // Store the category id for later use
          categoryMap.set(category.slug, categoryId);
          
        } catch (error) {
          console.error(`✗ Error importing category "${category.name}":`, error.message);
        }
      }

      // Then, upsert places with proper category relationships
      console.log('Upserting custom places...');
      for (const place of placesData) {
        try {
          // Prepare category relationships
          const categoryIds = [];
          if (place.categories && Array.isArray(place.categories)) {
            for (const categorySlug of place.categories) {
              const categoryId = categoryMap.get(categorySlug);
              if (categoryId) {
                categoryIds.push(categoryId);
              } else {
                console.warn(`⚠ Warning: Category "${categorySlug}" not found for place "${place.name}"`);
              }
            }
          }
          
          // Check if place exists by slug
          const existingPlace = await strapi.entityService.findMany('api::place.place', {
            filters: { slug: place.slug }
          });
          
          const placeData = {
            name: place.name,
            slug: place.slug,
            description: place.description,
            adress: place.adress,
            phone: place.phone,
            website: place.website,
            coordinates: place.coordinates,
            image: place.image,
            openingHours: place.openingHours,
            isBlurred: place.isBlurred,
            badgeText: place.badgeText,
            isFeatured: place.isFeatured
          };
          
          // Add category relationship if we have category IDs
          if (categoryIds.length > 0) {
            placeData.categories = categoryIds;
          }
          
          if (existingPlace && existingPlace.length > 0) {
            // Update existing place
            await strapi.entityService.update('api::place.place', existingPlace[0].id, {
              data: placeData
            });
            console.log(`✓ Place "${place.name}" updated successfully`);
          } else {
            // Create new place
            await strapi.entityService.create('api::place.place', {
              data: placeData
            });
            console.log(`✓ Place "${place.name}" created successfully`);
          }
          
        } catch (error) {
          console.error(`✗ Error importing place "${place.name}":`, error.message);
        }
      }

      // Mark custom data as imported
      const pluginStore = strapi.store({
        environment: strapi.config.environment,
        type: 'type',
        name: 'setup',
      });
      await pluginStore.set({ key: 'customDataHasRun', value: true });

      console.log('Custom data import completed!');
      
    } catch (error) {
      console.error('Error during custom data import:', error);
    }
  } else {
    console.log('Custom data has already been imported. We cannot reimport unless you clear the custom data flag.');
  }
}

// async function main() {
//   const { createStrapi, compileStrapi } = require('@strapi/strapi');

//   const appContext = await compileStrapi();
//   const app = await createStrapi(appContext).load();

//   app.log.level = 'error';

//   await seedExampleApp();
  
//   // Import custom data after seed data
//   await importCustomData();
//   await app.destroy();

//   process.exit(0);
// }

module.exports = async () => {
  // await seedExampleApp(); // DISABLED: Auto-import disabled
  // Import custom data after seed data
  // await importCustomData(); // DISABLED: Auto-import disabled
};
