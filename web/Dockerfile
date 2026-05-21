FROM node:20-alpine AS build

WORKDIR /app

COPY shared ./shared
COPY web ./web

WORKDIR /app/web

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm install
RUN ln -s /app/web/node_modules /app/node_modules
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app/web

ENV NODE_ENV=production
ENV VITE_PROXY_TARGET=http://server:3101
ENV PORT=5175
ENV HOST=0.0.0.0

COPY --from=build /app/web/package.json ./package.json
COPY --from=build /app/web/scripts ./scripts
COPY --from=build /app/web/node_modules ./node_modules
COPY --from=build /app/web/dist ./dist

EXPOSE 5175

CMD ["node", "scripts/serve-prod.mjs"]
