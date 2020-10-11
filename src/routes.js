const cors = require('cors');
const crypto = require('crypto');
const express = require('express');
const validator = require('validator');

const constants = require('./constants');
const {UrlShorten} = require('./models');

const router = express.Router();

router.post('/api/item', async (request, response) => {
    // POST request method receive values from body as form urlencoded

    // Checking if body parameter has been provided.
    if (request.body.url === undefined) {
        return response.status(400).json({
            message: constants.messages.urlNotProvided
        });
    }

    const originalUrl = request.body.url;

    // Checking if body parameter match URL pattern.
    if (!validator.isURL(originalUrl)) {
        return response.status(400).json({
            message: constants.messages.urlMalformed
        });
    }

    // If we had seen this URL before, returning it
    let item = await UrlShorten.findOne({originalUrl}).exec();
    if (item) {
        return response.status(200).json({
            originalUrl: item.originalUrl,
            shortUrl: item.shortUrl
        });
    }

    // Else, creating a new entry on the database and returning it.
    const digest = crypto.createHash('sha256').update(originalUrl).digest('base64');
    const urlCode = digest.slice(0, constants.urlCode.limit);

    try {
        // If you set a field to an invalid value, Mongoose will throw an error.
        let item = new UrlShorten({originalUrl, urlCode});

        await item.save();

        return response.status(200).json({
            originalUrl: item.originalUrl,
            shortUrl: item.shortUrl
        });
    } catch (error) {
        console.error(error);

        return response.status(500).json({
            message: constants.messages.mongoSaveError
        })
    }
});

router.get('/api/item/:code', cors(), async (request, response) => {
    // GET request method receive values from URI path

    // Checking if URI parameter has been provided.
    if (request.params.code === undefined) {
        return response.status(400).json({
            message: constants.messages.shortCodeNotProvided
        });
    }

    const urlCode = request.params.code;

    // Checking if URI parameter match a partial Base64 char encoding.
    const isUrlCode = new RegExp(constants.urlCode.regex);
    if (!isUrlCode.test(urlCode)) {
        return response.status(400).json({
            message: constants.messages.shortCodeMalformed
        });
    }

    // Retrieving entry from database and performing HTTP redirection.
    const item = await UrlShorten.findOne({urlCode});

    if (item) {
        return response.redirect(item.originalUrl);
    } else {
        return response.redirect(constants.errorUrl);
    }
});

module.exports = router;
