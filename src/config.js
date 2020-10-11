// This file contains external configurations passed as env vars.

module.exports = {
    app: {
        // All URLs would be shortened to this DNS domain name.
        domain: process.env.APP_DOMAIN || 'localhost',
    },
    node: {
        // TCP port used by ExpressJS.
        port: process.env.NODE_PORT || 8080,
    },
    mongo: {
        // MongoDB credentials and endpoint configuration.
        username: process.env.MONGO_USERNAME,
        password: process.env.MONGO_PASSWORD,
        hostname: process.env.MONGO_HOSTNAME,
        port: process.env.MONGO_PORT,
        database: process.env.MONGO_DB,
    },
}