const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const url = require('url');

const config = require('./config');
const constants = require('./constants');
const routes = require('./routes');

(async () => {

    // Initializing MongoDB.
    const mongoUrl = new url.URL(
        constants.templates.mongoUrl(
            config.mongo.username,
            config.mongo.password,
            config.mongo.hostname,
            config.mongo.port,
            config.mongo.database
        )
    );

    const mongoOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    };

    try {
        await mongoose.connect(mongoUrl.toString(), mongoOptions);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error', error);
        process.exit(1);
    }

    // Initializing ExpressJS.
    const app = express();

    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use(bodyParser.text());

    app.use('/', routes);

    app.listen(config.node.port, () => {
        console.log(`Server started on port ${config.node.port}`);
    });

})();
