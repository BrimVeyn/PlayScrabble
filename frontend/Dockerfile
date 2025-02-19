#------------------------------------------------------------------
FROM node:20 AS build
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install
COPY . .
RUN pnpm build
#------------------------------------------------------------------

#------------------------------------------------------------------
FROM build AS dev

EXPOSE 4430

CMD ["pnpm", "dev", "--host"]
#------------------------------------------------------------------

#------------------------------------------------------------------
FROM nginx:latest AS prod

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=build /app/build .

COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 4430

CMD ["nginx", "-g", "daemon off;"]
#------------------------------------------------------------------
