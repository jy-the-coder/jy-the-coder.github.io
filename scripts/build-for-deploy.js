#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

let fse;
try {
    fse = require('fs-extra');
} catch (e) {
    console.log('fs-extra not available, using native fs with polyfills');
    fse = {
        emptyDir: (dir) => {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            fs.mkdirSync(dir, { recursive: true });
        },
        copy: (src, dest) => {
            const copyRecursively = (source, destination) => {
                if (fs.lstatSync(source).isDirectory()) {
                    if (!fs.existsSync(destination)) {
                        fs.mkdirSync(destination, { recursive: true });
                    }
                    fs.readdirSync(source).forEach(file => {
                        copyRecursively(path.join(source, file), path.join(destination, file));
                    });
                } else {
                    fs.copyFileSync(source, destination);
                }
            };
            copyRecursively(src, dest);
        },
        readFile: (file, encoding) => fs.readFileSync(file, encoding),
        writeFile: (file, content) => fs.writeFileSync(file, content)
    };
}

const SOURCE_DIR = path.join(__dirname, '../web_app');
const DEST_DIR = path.join(__dirname, '../docs');

async function buildForDeploy() {
    console.log('Building for GitHub Pages deployment...');
    
    try {
        console.log('Cleaning docs directory...');
        await fse.emptyDir(DEST_DIR);

        console.log('Copying files from web_app to docs...');
        await fse.copy(SOURCE_DIR, DEST_DIR);

        console.log('Modifying app.js for GitHub Pages...');
        await modifyAppJs();

        console.log('Modifying index.html for GitHub Pages...');
        await modifyIndexHtml();

        console.log('Creating .nojekyll file...');
        await fse.writeFile(path.join(DEST_DIR, '.nojekyll'), '');
        
        console.log('Build completed successfully!');
        console.log('Files are ready in the docs/ directory for GitHub Pages');
        
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

async function modifyAppJs() {
    const appJsPath = path.join(DEST_DIR, 'app.js');
    let content = await fs.readFile(appJsPath, 'utf8');

    const envDetectionCode = `
const isGitHubPages = window.location.hostname.includes('github.io');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let basePath = '';
if (isGitHubPages) {
    basePath = window.location.pathname.replace(/\\/[^/]*$/, '');
    if (!basePath.endsWith('/')) basePath += '/';
} else if (isLocalhost) {
    basePath = './';
} else {
    basePath = './';
}

console.log('Environment detected:', { isGitHubPages, isLocalhost, basePath });
`;

    content = content.replace(
        'class RestaurantIntelligencePlatform {',
        envDetectionCode + '\nclass RestaurantIntelligencePlatform {'
    );

    content = content.replace(
        /fetch\('\.\/data\//g,
        "fetch(basePath + 'data/"
    );
    
    await fs.writeFile(appJsPath, content);
}

async function modifyIndexHtml() {
    const indexPath = path.join(DEST_DIR, 'index.html');
    let content = await fs.readFile(indexPath, 'utf8');

    const githubPagesMeta = `
    <meta name="description" content="Restaurant Business Intelligence Platform - Data-driven insights for restaurant success">
    <meta name="keywords" content="restaurant, business intelligence, data visualization, yelp analysis">
    <meta property="og:title" content="Restaurant Business Intelligence Platform">
    <meta property="og:description" content="Data-driven insights for restaurant success">
    <meta property="og:type" content="website">
    `;
    
    content = content.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' + githubPagesMeta
    );
    
    await fs.writeFile(indexPath, content);
}

buildForDeploy();
