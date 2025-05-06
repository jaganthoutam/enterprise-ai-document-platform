FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create health check file
RUN echo 'const http = require("http"); \
    const server = http.createServer((req, res) => { \
        if (req.url === "/health") { \
            res.writeHead(200, {"Content-Type": "text/plain"}); \
            res.end("OK"); \
        } \
    }); \
    server.listen(3000);' > health.js

# Set environment variables
ENV NODE_ENV=production
ENV AWS_ACCESS_KEY_ID=dummy-key
ENV AWS_SECRET_ACCESS_KEY=dummy-secret
ENV AWS_DEFAULT_REGION=us-east-1

# Command to run both health check and main service
CMD ["sh", "-c", "node health.js & node documents-lambda.js"] 