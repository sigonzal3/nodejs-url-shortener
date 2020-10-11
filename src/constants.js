// This file contains static configurations.

const urlCodeLimit = 8;

module.exports = {
    templates: {
        // MongoDB URL template.
        // See: https://docs.mongodb.com/manual/reference/connection-string/
        mongoUrl: (username, password, hostname, port, database) => {
            return `mongodb://${username}:${password}@${hostname}:${port}/${database}?authSource=admin`;
        },

        // Template used for converting original to short URL.
        shortUrl: (domain, urlCode) => {
            return `http://${domain}/${urlCode}`;
        }
    },

    urlCode: {
        // URL short codes are limited to N amount of chars.
        // SHA-256 is always 32 bytes. Converted to Base64 is expanded to 43 plus a char padding.
        // Limit should be in range [1, 44)
        limit: urlCodeLimit,

        // Regex used for validating short codes.
        regex: `^[A-Za-z0-9+/]{${urlCodeLimit}}$`
    },

    // 404 error URL.
    // I don't have a sample 404 error page, so I'm redirecting you to somewhere safe.
    errorUrl: 'http://example.com/',

    // Error messages.
    messages: {
        shortCodeNotProvided: 'Error: short code not provided.',
        shortCodeMalformed: 'Error: Malformed short code.',
        urlNotProvided: 'Error: URL not provided.',
        urlMalformed: 'Error: Malformed URL.',
        mongoSaveError: 'Error: Unable to store URL.'
    },
}
