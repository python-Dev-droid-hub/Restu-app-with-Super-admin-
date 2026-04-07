FROM node:20-alpine AS build

WORKDIR /app

COPY shared ./shared
COPY web ./web

WORKDIR /app/web

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm install
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app/web

ENV NODE_ENV=production

COPY --from=build /app/web/package.json ./package.json
COPY --from=build /app/web/vite.config.ts ./vite.config.ts
COPY --from=build /app/web/node_modules ./node_modules
COPY --from=build /app/web/dist ./dist

EXPOSE 5175

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5175", "--strictPort"]
