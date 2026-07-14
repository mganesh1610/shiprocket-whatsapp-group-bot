const fs = require('node:fs');
const path = require('node:path');

function createStateStore(filePath) {
  function read() {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  function write(nextState) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  }

  return {
    read,
    write
  };
}

module.exports = {
  createStateStore
};
