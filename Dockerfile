# -------- Build stage --------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# -------- Runtime stage (NGINX) --------
FROM nginx:1.27-alpine

# SPA-friendly config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure nginx can read everything
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} \;

EXPOSE 80
# No CMD needed; nginx image defaults to: nginx -g 'daemon off;'
# If you prefer to be explicit, use this (note no leading space):
# CMD ["nginx", "-g", "daemon off;"]