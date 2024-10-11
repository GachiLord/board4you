# build client
FROM node:latest AS client-builder

WORKDIR /

COPY ./client/package.json ./
COPY ./client/build ./build
COPY ./client/src ./src
COPY ./client/scripts ./scripts
COPY ./client/build.mjs ./
COPY ./client/public/web.html ./public/web.html
# install deps
RUN npm install --omit=optional -legacy-peer-deps
# build static
RUN npm run buildWeb

# build server
FROM rust AS server-builder

RUN apt update \ 
  && apt install protobuf-compiler -y 


RUN cargo new --bin board4you-build
WORKDIR /board4you-build
COPY ./server/Cargo.toml ./server/Cargo.toml
COPY ./server/src ./server/src
RUN mkdir protocol
COPY ./protocol/Cargo.toml ./protocol/Cargo.toml
COPY ./protocol/build.rs ./protocol/build.rs
COPY ./protocol/src ./protocol/src
WORKDIR ./server
RUN cargo build --release

# configure and run app
FROM ubuntu:24.10

ARG APP=/usr/src/app

EXPOSE 3000

ENV TZ=Etc/UTC \
  APP_USER=appuser

RUN groupadd $APP_USER \
  && useradd -g $APP_USER $APP_USER

COPY --from=server-builder /board4you-build/server/target/release/server ${APP}/server
COPY --from=client-builder /public ${APP}/public
COPY ./db/init.sql ${APP}

RUN chown -R $APP_USER:$APP_USER ${APP}

USER $APP_USER
WORKDIR ${APP}

ENV PUBLIC_PATH=${APP}/public
ENV DB_INIT_PATH=${APP}/init.sql
CMD ["./server"]
