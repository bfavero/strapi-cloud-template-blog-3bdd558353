module.exports = () => ({
  'strapi-csv-import-export': {
    enabled: true,
    config: {
      authorizedExports: ['api::place.place', 'api::category.category'],
      authorizedImports: ['api::place.place', 'api::category.category'],
    },
  },
});
