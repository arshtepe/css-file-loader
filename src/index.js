const path = require("path");
const fs = require("fs-extra");
const crypto = require('crypto');
const loaderUtils = require("loader-utils");
const URL_REGEXP = /url\s*(\(\s*".*?"\s*\)|\(\s*.*?\s*\))/g;
const css = require('css');


module.exports = function (content, map) {
    // if (this.cacheable) this.cacheable(); TODO
    const callback = this.async();
    if (!URL_REGEXP.test(content)) {
        return content;
    }
    const hash = crypto.createHash('sha256');
    const fileHash = hash.update(content).digest('hex');
    const options = loaderUtils.getOptions(this) || {};
    const resourcePath = path.dirname(this.resourcePath);
    const ast = css.parse(content);
    const copyList = [];
    const publicPath = this._compilation.outputOptions.publicPath;

    ast.stylesheet.rules.forEach(rule => {
        if (rule.type === "rule") {
            rule.declarations.forEach(declaration => {
                const urlValue = URL_REGEXP.exec(declaration.value);
                if (urlValue) {
                    const url = urlValue[0].replace(/^url\("?/, "").replace(/"?\)$/, "");
                    const distFilePath = path.join(resourcePath, url); //TODO ss.png?..
                    const outputName = `${fileHash}${path.extname(distFilePath)}`;
                    declaration.value = declaration.value.replace(url, publicPath + outputName); //TODO join url and check
                    copyList.push({
                        from: distFilePath,
                        to: path.join(options.outputPath, outputName)
                    });
                }
            })
        }
    });

    Promise.all(copyList.map(({ from, to }) => fs.pathExists(to).then(exists => {
        if (!exists) {
            return fs.copy(from, to);
        }
    }))).then(() => callback(null, css.stringify(ast), map));
};
