const authentication = require('./authentication');
const hideSecrets = require('./creates/hideSecrets');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,
  authentication,
  creates: {
    [hideSecrets.key]: hideSecrets
  }
};
