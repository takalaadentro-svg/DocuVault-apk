FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build production bundle
RUN npm run build

# Install lightweight production static server
RUN npm install -g serve

# Render sets PORT dynamically (defaults to 10000)
ENV PORT=10000
EXPOSE 10000 5173 80

# Serve SPA production bundle on Render's dynamic PORT
CMD ["sh", "-c", "serve -s dist -l ${PORT:-10000}"]
