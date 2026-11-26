FROM node:22-alpine

WORKDIR /app
COPY *.mjs package.json ./
COPY data/*.json ./data/

ENV PORT=8080
ENV DATA_DIR=/app/data
EXPOSE 8080

CMD ["node", "server.mjs"]
