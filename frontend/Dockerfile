# --- Build Stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Cache dependency installation layer prior to source code copy
COPY package*.json ./
RUN npm install

COPY . .
# Compile React application to static assets
RUN npm run build

# --- Runtime Stage ---
FROM nginx:alpine

# Serve static assets via Nginx for optimal production performance
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Execute Nginx in the foreground to prevent container exit
CMD ["nginx", "-g", "daemon off;"]