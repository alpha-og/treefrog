FROM golang:1.22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-full \
    latexmk \
    perl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app
RUN go build -o /usr/local/bin/remote-builder ./

EXPOSE 9000
ENV PORT=9000
ENV BUILDER_WORKDIR=/tmp/treefrog-builds

CMD ["/usr/local/bin/remote-builder"]
