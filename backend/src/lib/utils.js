// Filename whitelist validation for template creation
function validFilename(filename) {
  const regex = /^[\p{Letter}\p{Mark}0-9 \[\]'()_-]+$/iu;
    
    return (regex.test(filename));
}
exports.validFilename = validFilename;

function validExtension(ext) {
  const regex = /^[a-zA-Z]+$/;
    
    return (regex.test(ext));
}
exports.validExtension = validExtension;

// Escape XML special entities when using {@RawXML} in template generation
function escapeXMLEntities(input) {
    var XML_CHAR_MAP = { '<': '&lt;', '>': '&gt;', '&': '&amp;'};
    var standardEncode = input.replace(/[<>&]/g, function (ch) { return XML_CHAR_MAP[ch]; });
    return standardEncode;
}
exports.escapeXMLEntities = escapeXMLEntities;

// Convert number to 3 digits format if under 100
function lPad(number) {
    if (number <= 99) { number = ("00" + number).slice(-3); }
    return `${number}`;
}
exports.lPad = lPad;

function escapeRegex(regex) {
    return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}
exports.escapeRegex = escapeRegex

function generateUUID() {
    return require('crypto').randomBytes(32).toString('hex')
}
exports.generateUUID = generateUUID

var getObjectPaths = (obj, prefix = '') =>
  Object.keys(obj).reduce((res, el) => {
    if( Array.isArray(obj[el]) ) {
      return [...res, prefix + el];
    } else if( typeof obj[el] === 'object' && obj[el] !== null ) {
      return [...res, ...getObjectPaths(obj[el], prefix + el + '.')];
    }
    return [...res, prefix + el];
  }, [])
exports.getObjectPaths = getObjectPaths

function getSockets(io, room) {
  var result = []
  io.sockets.sockets.forEach((data) => {
    if (data.rooms.has(room)) {
      result.push(data)
    }
  })
  return result
}
exports.getSockets = getSockets

// Clean HTML tags and decode HTML entities
function cleanHTML(text) {
    if (!text) return '';
    
    // First, decode HTML entities
    const entities = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&#x2F;': '/',
        '&#x27;': "'",
        '&#x60;': '`'
    };
    
    // Replace HTML entities
    let decodedText = text.replace(/&[^;]+;/g, match => {
        return entities[match] || match;
    });
    
    // Then remove HTML tags
    decodedText = decodedText.replace(/<[^>]*>/g, '');
    
    // Normalize whitespace
    decodedText = decodedText.replace(/\s+/g, ' ').trim();
    
    return decodedText;
}
exports.cleanHTML = cleanHTML;
