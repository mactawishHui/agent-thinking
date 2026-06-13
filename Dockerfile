FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY articles ./articles
COPY site ./site

WORKDIR /app/site

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "start"]
