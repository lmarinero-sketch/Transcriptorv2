# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build args become env vars at build time for Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ARG VITE_HUB_SUPABASE_URL
ARG VITE_HUB_SUPABASE_ANON_KEY

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
