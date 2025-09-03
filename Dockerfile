# -------- Build Stage --------
FROM node:20-alpine AS builder

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --production=false

# Copy app source and build
COPY . .
RUN npm run build

# -------- Runtime Stage (NGINX) --------
FROM nginx:1.27-alpine

# Remove default config and add custom for SPA and performance
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Set permissions for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} \;

EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]