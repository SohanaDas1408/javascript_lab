function createParser(callback) {
  let buffer = '';
  return function parseChunk(chunk) {
    buffer += chunk.toString();
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (line.trim()) {
        try {
          const parsedObj = JSON.parse(line);
          callback(parsedObj);
        } catch (e) {
          console.error('Failed to parse JSON:', line, e);
        }
      }
    }
  };
}

function serialize(obj) {
  return JSON.stringify(obj) + '\n';
}

module.exports = { createParser, serialize };
