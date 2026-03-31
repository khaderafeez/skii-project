# Build Stage: Compile React application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage: Serve static assets via Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]