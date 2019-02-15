// Create and export configuration variables

// Dependances
const cnfg = require('./config.json');

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
  'httpsPort' : 3001,
  'envName' : 'staging',
  'hashingSecret' : cnfg.hashingSecret,
  'maxChecks' : 5,
  'authTokenStripe':cnfg.testAuthTokenStripe,
  'apiKeyMailgun':cnfg.apiKeyMailgun,
  'domainNameMailgun':cnfg.domainNameMailgun,
};

// Production environment
environments.production = {
  'httpsPort' : process.env.PORT,
  'envName' : 'production',
  'hashingSecret' : process.env.hashingSecret,
  'maxChecks' : 10,
  'authTokenStripe':cnfg.AuthTokenStripe,
  'apiKeyMailgun':cnfg.apiKeyMailgun,
  'domainNameMailgun':cnfg.domainNameMailgun,
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;