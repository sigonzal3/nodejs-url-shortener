# URL Shortener using Node.js, MongoDB and Nginx

## System Requirements
Tested using:
* Ubuntu 20.04.1 LTS
* Docker version 19.03.13, build 4484c46d9d
* docker-compose version 1.27.4, build 40524192

You will need to install:
* docker
* docker-compose
* curl

## Problem Statement

Design an URL shortening service API using NodeJS and MongoDB.

Limitations:
* Short URL codes needs to be up to 8 characters long.
* For every submitted URLs, should always yield the same short URL.

Endpoints:
* Submitting new URLs to be shortened
    * POST /api/item
    * Expects ```url``` parameter as ```application/x-www-form-urlencoded```.

Notes:
* You are free to design the URL redirection endpoint in any way.

## Discussion

Requirements suggest that a submitted URL translates to one and only one short URL.
This is an indication that we need to use a hashing function.

I have chosen SHA256 as the hashing method, producing a 256-bit (32 bytes) of raw data. This value
encoded into Base64, creates a stream of 43 characters plus the padding character "=". We are only interested
in the first 8 characters of this stream, imitating Git's short commits hashes, but using Base64 instead of Hex.

The reason that I'm using Base64 is because of user experience, since its more friendly than hexadecimal values.

The Base64 total sample space is 64 elements, consisting of:

* all uppercase letters (26)
* all lowercase letters (26)
* numbers from 0 to 9 (10)
* the plus sign "+"
* the slash char "/"

If I choose a fixed short code of exactly 8 chars, and:

* order doesn't matter
* allow repeating values

This corresponds to a permutation with the formula n^r,
where n is the total sample space of 26 and r is the 8 char index slots.

The total possible distinct values are 64^8 = 281474976710656

Things to keep in mind for analyzing hash collisions of this implementation:

* I'm encoding SHA256 as Base64, and only taking the first 8 characters.
* SHA256 collision guarantees only applies if you use the entire 32 bytes.
* By taking the first 8 chars of an encoded Base64, I'm weakening the hash algorithm considerably.
* Using a Hex encoding instead of Base64 doesn't change the outcome. Our problem is related to not using the entire byte stream.
* Everytime you pick and reserve a short code, the sample space reduces, thus, increasing the probability of a collision next time.

## Future Improvements

* Considerate TLS early in the development stage. It helps discover bugs and changes in procedures.
    * MongoDB connection should use TLS for encryption at traffic.
    * Web traffic should use TLS too.

* MongoDB database would be eventually filled with stale data. Here are some cleanup strategies:
    * Configure MongoDB with automatic document expirations, leveraging the ```updatedAt``` field.
        * See: ttps://mongoosejs.com/docs/api.html#schemadateoptions_SchemaDateOptions-expires
    * Invalidate/disable instead of removing?
    * Using cron job or external agent for batch cleanup?
        *  See: https://docs.mongodb.com/manual/reference/method/Bulk.find.remove/

* CORS security needs to be improved in the redirection route instead of using a wildcard.
    * See: http://expressjs.com/en/resources/middleware/cors.html#configuring-cors-w-dynamic-origin

* Replace test manual effort with an unit testing framework.
    * Due to time constraints, I'm using Curl and Mongo Shell for testing and validation.
    * I was investigating Jest as a test framework.
    * Choosing a framework is difficult since there are a lot of options and opinions in the NodeJS community.
    * SuperTest can be used for easy HTTP endpoint test. Looks easier than Axios for testing.

* Investigate testing with MongoDB. Found two approaches with pros/cons:
    * Should I use MongoDB In-Memory Server? Easier to setup with NPM but not a real representation of production.
    * Should I use instead a real MongoDB instance with seeding routines?

* Migrating from Docker Compose to Kubernetes YAMLs running in Minikube.
    * I avoided Kubernetes, since installing Docker Compose is easier for anyone to try and test.
    * Still, using Kubernetes and Helm can be an interesting challenge. Implementation is more close to production.
    * Kubernetes allow easy scaling NodeJS, and using Secrets / ConfigMaps.

* When NodeJS starts scaling, I will needs to use MongoDB's transactions during save operation.
    * Wasn't implemented to keeps things simple for this demo.
    * But, NodeJS current implementation first checks if a document exists, and if not, proceeds to save.
    * There is a potential race codition during this peek and save operation.

* Enable TypeScript and prepare CI/CD build pipeline using GitHub Actions.
    * Need to investigate how to use GitHub Actions, since I'm more familiar with GitLab CI and Jenkins.
    * TypeScript is optional and helps improves documentation and source code static analysis / linting.
    * There are many opinions in the web community, if TypeScript should be used in NodeJS.

# Demo Instructions

## Step 1

Create a file with the name ```.env``` in the project root directory.

This file will be consumed by docker-compose during services creation.

The file schema is:

```ini
MONGO_USERNAME=
MONGO_PASSWORD=
MONGO_HOSTNAME=db
MONGO_PORT=
MONGO_DB=
```

Be sure to fill the empty fields with your own values. Here is an example:

```ini
MONGO_USERNAME=myuser
MONGO_PASSWORD=password
MONGO_HOSTNAME=db
MONGO_PORT=27017
MONGO_DB=url-shortner
```

Notes:
* ```MONGO_HOSTNAME``` needs to always be ```db```.
* This is the hostname configured in docker-compose.yml.
* If you want to use your own, the change needs to happen at both files.

This is the project layout that you end up with:

```
.
├── assets
│   └── nginx.conf
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── src
    ├── config.js
    ├── constants.js
    ├── models.js
    ├── routes.js
    └── server.js

2 directories, 14 files
```

## Step 2

We start this demo by creating the Docker container services.

All Docker containers have been configured to use ephemeral storage for this demo.

```sh
docker-compose up --detach
```

Confirm that all containers are running:

```sh
docker-compose ps
```

You should see an output similar to this:

```
Name               Command               State            Ports          
-------------------------------------------------------------------------
db      docker-entrypoint.sh mongod      Up      0.0.0.0:27017->27017/tcp
nginx   /docker-entrypoint.sh ngin ...   Up      0.0.0.0:80->80/tcp      
web     docker-entrypoint.sh node  ...   Up      0.0.0.0:8080->8080/tcp
```

As you can see, all services have ports binded on your local machine, so you can
monitor them directly:

* Nginx is using TCP port 80. Its configured to behave as a reverse proxy to NodeJS.
* NodeJS web server is using TCP port 8080.
* MongoDB is using the port that you have configured in the ```.env``` file. In this example, is using default TCP port 27017.

## Step 3

First, let's confirm that NodeJS is running. This command will help us continuously monitor the process.

```sh
docker-compose logs --follow 'web'
```

The expected output is:

```
Attaching to web
web      | Connected to MongoDB
web      | Server started on port 8080
```

Next, confirm that you are able to connect to MongoDB.

Fill the shell variable placeholders with your own values. You can do this in another terminal tab.

```sh
# If you have chosen a password with special characters, be sure to urlencode it.
mongo "mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@localhost:${MONGO_PORT}/${MONGO_DB}?authSource=admin"
```

The database should be empty at this point.

```sh
# See all available collections by name.
# You should find here the collection that you specified in the ".ini" file.
db.getCollectionNames()

# Replace <collection> with the name of your collection.
coll = db.<collection>

# Dump content of this collection. Should be empty.
coll.find()
```

Expected output:

```sh
> db.getCollectionNames()
[ "urlshortens" ]
> coll = db.urlshortens
url-shortner.urlshortens
> coll.find()
> 
```


## Step 4

We are going to post an URL to be shortened.

```sh
# Using Google as an URL example.
# If yo prefer, you can replace it with your own value. Keep in mind that this will generate a different hash.
URL='https://www.google.com/'

# Performing POST request as application/x-www-form-urlencoded
curl --silent --verbose --request POST --data "url=${URL}" "http://localhost/api/item"
```

Expected output:

```
*   Trying 127.0.0.1:80...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 80 (#0)
> POST /api/item HTTP/1.1
> Host: localhost
> User-Agent: curl/7.68.0
> Accept: */*
> Content-Length: 27
> Content-Type: application/x-www-form-urlencoded
> 
* upload completely sent off: 27 out of 27 bytes
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Server: nginx/1.19.3
< Date: Sun, 11 Oct 2020 17:52:36 GMT
< Content-Type: application/json; charset=utf-8
< Content-Length: 80
< Connection: keep-alive
< X-Powered-By: Express
< ETag: W/"50-gFbz0LZ4VVwzfOjDe4U6pp2dZR0"
< 
* Connection #0 to host localhost left intact
{"originalUrl":"https://www.google.com/","shortUrl":"http://localhost/0OGWoMJd"}
```

Things to notice:
* Server responded with MIME type ```application/json```
* Server identified himself as ```nginx/1.19.3```
* NodeJS injected his own custom header as ```X-Powered-By: Express```
* The response was tagged as cacheable by including an ETag header.

If you used the same demo URL link, the server response output should be:

```json
{
    "originalUrl": "https://www.google.com/",
    "shortUrl": "http://localhost/0OGWoMJd"
}
```

Confirm that the URL shortener service has stored this data using MongoDB Shell:

```sh
> db.getCollectionNames()
[ "urlshortens" ]
> coll = db.urlshortens
url-shortner.urlshortens
> coll.find()
{ "_id" : ObjectId("5f8346642a53f52af272f8ba"), "originalUrl" : "https://www.google.com/", "urlCode" : "0OGWoMJd", "createdAt" : ISODate("2020-10-11T17:52:36.677Z"), "updatedAt" : ISODate("2020-10-11T17:52:36.677Z"), "__v" : 0 }
> 
```

Things to notice:
* Document contains fields ```id```, ```originalUrl```, ```urlCode```, ```createdAt```, ```updatedAt``` and ```__v```.
* Many of these fields have default values or are autogenerated by MongoDB.
* The field ```shortUrl``` is a virtual field that doesn't exist on the database.
* Server only responds with the minimum needed values and omits all others as a security measure.

## Step 5

Its time to try out the main functionality. We are going to see if a short URL can redirect us to the main website.

```sh
# This short code hash matches my previous demo link. Adapt it to your needs.
SHORT_CODE='0OGWoMJd'

# Performing a GET request with "follow redirection" enabled.
curl --silent --verbose --location --request GET "http://localhost/${SHORT_CODE}"
```

Expected output (trimmed):

```
*   Trying 127.0.0.1:80...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 80 (#0)
> GET /0OGWoMJd HTTP/1.1
> Host: localhost
> User-Agent: curl/7.68.0
> Accept: */*
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 302 Found
< Server: nginx/1.19.3
< Date: Sun, 11 Oct 2020 18:22:56 GMT
< Content-Type: text/plain; charset=utf-8
< Content-Length: 45
< Connection: keep-alive
< X-Powered-By: Express
< Access-Control-Allow-Origin: *
< Location: https://www.google.com/
< Vary: Accept
< 
* Ignoring the response-body
* Connection #0 to host localhost left intact
* Issue another request to this URL: 'https://www.google.com/'
*   Trying 108.177.122.105:443...
* TCP_NODELAY set
* Connected to www.google.com (108.177.122.105) port 443 (#1)
* ALPN, offering h2
* ALPN, offering http/1.1
* successfully set certificate verify locations:
*   CAfile: /etc/ssl/certs/ca-certificates.crt
  CApath: /etc/ssl/certs
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.3 (IN), TLS handshake, Encrypted Extensions (8):
* TLSv1.3 (IN), TLS handshake, Certificate (11):
* TLSv1.3 (IN), TLS handshake, CERT verify (15):
* TLSv1.3 (IN), TLS handshake, Finished (20):
* TLSv1.3 (OUT), TLS change cipher, Change cipher spec (1):
* TLSv1.3 (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* ALPN, server accepted to use h2
* Server certificate:
*  subject: C=US; ST=California; L=Mountain View; O=Google LLC; CN=www.google.com
*  start date: Sep 22 15:27:20 2020 GMT
*  expire date: Dec 15 15:27:20 2020 GMT
*  subjectAltName: host "www.google.com" matched cert's "www.google.com"
*  issuer: C=US; O=Google Trust Services; CN=GTS CA 1O1
*  SSL certificate verify ok.
* Using HTTP2, server supports multi-use
* Connection state changed (HTTP/2 confirmed)
* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0
* Using Stream ID: 1 (easy handle 0x55b706653db0)
> GET / HTTP/2
> Host: www.google.com
> user-agent: curl/7.68.0
> accept: */*
> 
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
* old SSL session ID is stale, removing
* Connection state changed (MAX_CONCURRENT_STREAMS == 100)!
< HTTP/2 200 
< date: Sun, 11 Oct 2020 18:22:56 GMT
< expires: -1
< cache-control: private, max-age=0
< content-type: text/html; charset=ISO-8859-1
< p3p: CP="This is not a P3P policy! See g.co/p3phelp for more info."
< server: gws
< x-xss-protection: 0
< x-frame-options: SAMEORIGIN
< set-cookie: 1P_JAR=2020-10-11-18; expires=Tue, 10-Nov-2020 18:22:56 GMT; path=/; domain=.google.com; Secure
< set-cookie: NID=204=QzsU9EX-C8L61TPRee6s3cdjGkCG74thAsT6oIN607bFyOj0iqvJ_8uIVuFsEu1LaGuJdYMsdmwinsCy32ljkzLP6Ru1TUT4JyMDuZF-ZxdyyXttFJdkvcLsGQaplVvGFSAVvKW8Cuj6CH9dfgIw0L7HkzTxEGyysldABTV6Gtw; expires=Mon, 12-Apr-2021 18:22:56 GMT; path=/; domain=.google.com; HttpOnly
< alt-svc: h3-Q050=":443"; ma=2592000,h3-29=":443"; ma=2592000,h3-27=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-T050=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"
< accept-ranges: none
< vary: Accept-Encoding
< 
<!doctype html>

...

Connection #1 to host www.google.com left intact
```

Things to notice:
* CORS has been configured to allow any domain using ```Access-Control-Allow-Origin: *```.
* You should be able to use your browser instead of Curl for this step.

## Step 6

The demo ends here. Let's cleanup all created resources:

```sh
docker-compose down
```

## Testing Edge Cases

1. Application error during initialization should exit gracefully and not proceed forward.
2. POST request without ```url``` parameter should return HTTP 400 and an error message.
3. POST request with invalid malformed ```url``` parameter should return HTTP 400 and an error message.
4. Multiple POST requests should return the same shortUrl. There should be no duplicates in the database.
5. GET request without ```code``` parameter should redirect you to 404 URL.
6. GET request with invalid malformed ```code``` parameter should redirect you to 404 URL.
7. GET request with non-existent ```code``` should redirect you to 404 URL.
8. If Mongoose schema validations failed during save, should return HTTP 500 and an error message.
