#------------------------------------------------------------------
FROM node:20 AS build
WORKDIR /app

# Copy package.json and package-lock.json before installing dependencies
COPY package.json package-lock.json ./

RUN npm ci

# Copy the entire app and build
COPY . .
#------------------------------------------------------------------

#------------------------------------------------------------------
FROM node:20 AS dev
WORKDIR /app

# Use cached dependencies from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
#------------------------------------------------------------------

#------------------------------------------------------------------
FROM nginx:latest AS prod

RUN npm run build

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=build /app/build .

# Copy Nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 4430

CMD ["nginx", "-g", "daemon off;"]
#------------------------------------------------------------------

