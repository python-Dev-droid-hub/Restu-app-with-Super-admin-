FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./

RUN npm ci

COPY src ./src

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN mkdir -p /app/dist/uploads /app/logs

ENV NODE_ENV=production
ENV PORT=3101
EXPOSE 3101

CMD ["node", "dist/index.js"]
