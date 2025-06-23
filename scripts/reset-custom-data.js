// Set required environment variables
process.env.APP_KEYS = "toBeModified1,toBeModified2";
process.env.API_TOKEN_SALT = "toBeModified";
process.env.ADMIN_JWT_SECRET = "toBeModified";
process.env.JWT_SECRET = "toBeModified";
process.env.TRANSFER_TOKEN_SALT = "toBeModified";

const { createStrapi, compileStrapi } = require('@strapi/strapi');

async function resetCustomDataFlag() {
  try {
    console.log('Resetting custom data import flag...');
    
    const appContext = await compileStrapi();
    const app = await createStrapi(appContext).load();
    
    // Get the plugin store
    const pluginStore = app.store({
      environment: app.config.environment,
      type: 'type',
      name: 'setup',
    });
    
    // Remove the custom data flag
    await pluginStore.delete({ key: 'customDataHasRun' });
    
    console.log('✓ Custom data import flag has been reset.');
    console.log('✓ All other data (admin users, seed data, etc.) has been preserved.');
    console.log('✓ You can now restart the server to reimport custom data.');
    
    await app.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting custom data flag:', error);
    process.exit(1);
  }
}

resetCustomDataFlag(); 