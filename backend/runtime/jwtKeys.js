const fs = require('fs');
const path = require('path');

const readKeyFromEnv = (envValue) => {
    if (!envValue) return null;
    return envValue.replace(/\\n/g, '\n');
};

const readKeyFromFile = (filePath) => {
    if (!filePath) return null;
    const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);
    return fs.readFileSync(resolvedPath, 'utf-8');
};

const loadKey = (envKey, envPathKey, label) => {
    const fromEnv = readKeyFromEnv(process.env[envKey]);
    if (fromEnv) return fromEnv;

    const fromFile = readKeyFromFile(process.env[envPathKey]);
    if (fromFile) return fromFile;

    throw new Error(`${label} not configured. Set ${envKey} or ${envPathKey}.`);
};

module.exports = { loadKey };
