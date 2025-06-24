FROM node:22.15.0

WORKDIR /app

COPY package*.json ./
RUN rm -f package-lock.json \
 && npm install --legacy-peer-deps --package-lock-only \
 && npm install --legacy-peer-deps \
 && npm rebuild

COPY . .

EXPOSE 8000
CMD ["npm", "run", "dev"]
