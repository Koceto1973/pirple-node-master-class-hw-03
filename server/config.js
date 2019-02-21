// Create and export configuration variables

// Dependances
const cnfg = require('./config.json');

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
  'httpsPort' : 3002,
  'envName' : 'staging',
  'hashingSecret' : cnfg.hashingSecret,
  'authTokenStripe':cnfg.testAuthTokenStripe,
  'apiKeyMailgun':cnfg.apiKeyMailgun,
  'domainNameMailgun':cnfg.domainNameMailgun,
  'templateGlobals' : {
    'appName' : 'Swifty Tasty Pizza',
    'companyName' : 'Easy, Inc.',
    'yearCreated' : '2019'
  },
};

// Production environment
environments.production = {
  'httpsPort' : process.env.PORT,
  'envName' : 'production',
  'hashingSecret' : process.env.hashingSecret,
  'authTokenStripe':cnfg.AuthTokenStripe,
  'apiKeyMailgun':cnfg.apiKeyMailgun,
  'domainNameMailgun':cnfg.domainNameMailgun,
  'templateGlobals' : {
    'appName' : 'Swifty Tasty Pizza',
    'companyName' : 'Easy, Inc.',
    'yearCreated' : '2019'
  },
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;