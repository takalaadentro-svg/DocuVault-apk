FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build application
RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "dev"]
