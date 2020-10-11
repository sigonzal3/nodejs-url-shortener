const mongoose = require('mongoose');
const validator = require('validator');

const config = require('./config');
const constants = require('./constants');

const urlShortenSchema = mongoose.Schema({
    originalUrl: {
        type: String,
        required: true,
        unique: true,
        validate: (value) => {
            return validator.isURL(value);
        }
    },
    urlCode: {
        type: String,
        required: true,
        unique: true,
        validate: (value) => {
            const regex = new RegExp(constants.urlCode.regex);
            return regex.test(value);
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

urlShortenSchema.virtual('shortUrl').get(function () {
    return constants.templates.shortUrl(config.app.domain, this.urlCode);
});

module.exports = {
    UrlShorten: mongoose.model('UrlShorten', urlShortenSchema)
}
