const fs = require("fs-extra");
const crypto = require('crypto');

module.exports.getFileHash = filePath => {
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
};

module.exports.getPublicPath = (compilation, options) => {
    if(options.publicPath) {
        return options.publicPath;
    }
    else if(compilation.outputOptions &&  compilation.outputOptions.publicPath) {
        return compilation.outputOptions.publicPath;
    }

    return "/";
};
