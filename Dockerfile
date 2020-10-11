# Latest LTS Version: 12.19.0
FROM node:12.19.0

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY src/ ./

EXPOSE 8080
USER node

CMD ["node", "server.js"]
