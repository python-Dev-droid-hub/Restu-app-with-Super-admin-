FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./

RUN npm ci

COPY src ./src

RUN npm run build

RUN mkdir -p /app/dist/uploads /app/logs

ENV NODE_ENV=production
ENV PORT=3000
ENV TS_NODE_BASEURL=./dist

EXPOSE 3000

CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]
