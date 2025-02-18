FROM node:20

WORKDIR /app

# Install pnpm globally (since you're using pnpm)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of the frontend code
COPY . .

# Build the React app
RUN pnpm build

# Use Nginx to serve the built files
FROM nginx:latest

WORKDIR /usr/share/nginx/html

# Remove default nginx files and copy the build output
RUN rm -rf ./*
COPY --from=build /app/build .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

