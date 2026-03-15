# Production Build Stage
FROM node:20-slim

# Set environment
ENV NODE_ENV=production
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Ensure data folders exist for local scripts
RUN mkdir -p data/pdfs data/statusSonda

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
