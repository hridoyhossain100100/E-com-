const fs = require('fs');
try {
    const data = fs.readFileSync('diagnostics_raw.json', 'utf8');
    const json = JSON.parse(data);
    console.log(JSON.stringify(json.debug, null, 2));
} catch (e) {
    console.error('Error parsing diagnostics_raw.json:', e.message);
}
