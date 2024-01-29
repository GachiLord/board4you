# build client
FROM node:latest as client-builder

WORKDIR /

COPY ./client/package.json ./
COPY ./client/build ./build
COPY ./client/src ./src
COPY ./client/scripts ./scripts
COPY ./client/public/web.html ./public/web.html
# install deps
RUN npm install --omit=optional -legacy-peer-deps
# build static
RUN npm run buildWeb

# build server
FROM nwtgck/rust-musl-builder:latest as server-builder

RUN USER=root cargo new --bin board4you-build
WORKDIR /board4you-build
COPY ./server/Cargo.toml ./Cargo.toml
COPY ./server/src ./src
RUN cargo generate-lockfile
RUN cargo build --release

# configure and run app
FROM alpine:latest

ARG APP=/usr/src/app

EXPOSE 3000

ENV TZ=Etc/UTC \
  APP_USER=appuser

RUN addgroup -S $APP_USER \
  && adduser -S -g $APP_USER $APP_USER

RUN apk update \
  && apk add --no-cache ca-certificates tzdata \
  && rm -rf /var/cache/apk/*

COPY --from=server-builder /board4you-build/target/x86_64-unknown-linux-musl/release/server ${APP}/server
COPY --from=client-builder /public ${APP}/public
COPY ./db/init.sql ${APP}

RUN chown -R $APP_USER:$APP_USER ${APP}

USER $APP_USER
WORKDIR ${APP}

ENV PUBLIC_PATH=${APP}/public
ENV DB_INIT_PATH=${APP}/init.sql
CMD ["./server"]
