FROM frolvlad/alpine-glibc:alpine-3.19
ARG MONGO_VER=7.0.14

RUN apk add --no-cache curl tar ca-certificates tzdata \
 && curl -fsSL https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-$MONGO_VER.tgz -o /tmp/mongo.tgz \
 && mkdir -p /opt/mongodb && tar -xzf /tmp/mongo.tgz -C /opt/mongodb --strip-components=1 \
 && rm /tmp/mongo.tgz \
 && adduser -D -h /var/lib/mongo -s /sbin/nologin mongodb \
 && mkdir -p /data/db && chown -R mongodb:mongodb /data/db

ENV PATH="/opt/mongodb/bin:${PATH}"
USER mongodb
EXPOSE 27017
CMD ["mongod", "--bind_ip_all"]
