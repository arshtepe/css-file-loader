const path = require("path");
const fs = require("fs-extra");
const crypto = require('crypto');
const loaderUtils = require("loader-utils");
const css = require('css');
const urlUtils = require("url");
const CSS_URL_REGEXP = /url\s*(\(\s*.*?\s*\))/g;
const URL_REGEXP = /^.+?\.\w+/;

function getFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const read = fs.ReadStream(filePath);
        const hash = crypto.createHash('sha1');
        hash.setEncoding("hex");
        read.pipe(hash);
        read.on("end", () => {
            hash.end();
            resolve(hash.read());
        });
        read.on("error", reject);
    })

}

module.exports = function (content, map) {
    const callback = this.async();
    if (!CSS_URL_REGEXP.test(content)) {
        return content;
    }
    const ast = css.parse(content);
    const resourcePath = path.dirname(this.resourcePath);
    const publicPath = this._compilation.outputOptions.publicPath;
    const resPromises = [];

    ast.stylesheet.rules.forEach(rule => {
        if (rule.type === "rule") {
            rule.declarations.forEach(declaration => {
                const urlValue = declaration.value.match(CSS_URL_REGEXP);
                if (urlValue) {
                    const url = urlValue[0].replace(/^url\("?/, "").replace(/"?\)$/, "").trim();
                    const clearPath = URL_REGEXP.exec(url)[0]; //get real path without url query
                    const sourceFilePath = path.join(resourcePath, clearPath);

                    resPromises.push(getFileHash(sourceFilePath).then(fileHash => {
                        const outputName = `${fileHash}${path.extname(sourceFilePath)}`;
                        declaration.value = declaration.value.replace(url, urlUtils.resolve(publicPath, outputName));
                        return fs.readFile(sourceFilePath).then(data => {
                            this.emitFile(outputName, data);
                        });
                    }));
                }
            })
        }
    });

    Promise.all(resPromises)
        .then(() => callback(null, css.stringify(ast), map));

};
