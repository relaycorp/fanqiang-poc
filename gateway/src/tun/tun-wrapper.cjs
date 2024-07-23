const path = require('path');
const tun = require(
  path.join(__dirname, '..', '..', 'build', 'Release', 'tun.node'),
);

module.exports = { tunAlloc: tun.tunAlloc };
