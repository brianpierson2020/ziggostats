FROM node:lts
EXPOSE 43015/tcp

WORKDIR /app

COPY src/package*.json ./
COPY src/api.js ./
COPY src/extract.js ./

# I know, many dependencies. Sorry. Aparently needed for Puppeteer to function within Docker
# https://medium.com/@ssmak/how-to-fix-puppetteer-error-while-loading-shared-libraries-libx11-xcb-so-1-c1918b75acc3
# https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md
RUN apt update \
    && apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget curl \
    && npm install

HEALTHCHECK --interval=60s --timeout=10s --retries=3 CMD (curl -sS http://localhost:80) || exit 1
ENTRYPOINT ["node", "/app/api.js"]