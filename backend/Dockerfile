FROM node:22-alpine

WORKDIR /app
COPY backend/ ./backend/
COPY src/data/*.json ./data/

ENV PORT=8080
ENV DATA_DIR=/app/data
EXPOSE 8080

CMD ["node", "backend/server.mjs"]
