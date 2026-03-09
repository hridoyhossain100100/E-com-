const http = require('http');

function checkPort(host, port) {
    return new Promise((resolve) => {
        const req = http.get({ hostname: host, port, path: '/' }, (res) => {
            resolve(`${host}:${port} -> SUCCESS (${res.statusCode})`);
        });
        req.on('error', (err) => {
            resolve(`${host}:${port} -> FAILED (${err.message})`);
        });
        req.end();
    });
}

async function main() {
    console.log(await checkPort('127.0.0.1', 3000));
    console.log(await checkPort('::1', 3000));
    console.log(await checkPort('localhost', 3000));
}
main();
