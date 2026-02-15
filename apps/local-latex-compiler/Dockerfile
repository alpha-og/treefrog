FROM golang:1.24-bookworm AS builder
WORKDIR /build

RUN printf 'go 1.24.0\n\nuse (\n\t./apps/local-latex-compiler\n\t./packages/go/build\n\t./packages/go/config\n\t./packages/go/logging\n\t./packages/go/security\n\t./packages/go/synctex\n\t./packages/go/validation\n)\n' > go.work

COPY apps/local-latex-compiler/go.mod apps/local-latex-compiler/go.sum ./apps/local-latex-compiler/
COPY packages/go/build/go.mod packages/go/build/go.sum ./packages/go/build/
COPY packages/go/config/go.mod ./packages/go/config/
COPY packages/go/logging/go.mod packages/go/logging/go.sum ./packages/go/logging/
COPY packages/go/security/go.mod ./packages/go/security/
COPY packages/go/synctex/go.mod ./packages/go/synctex/
COPY packages/go/validation/go.mod ./packages/go/validation/

RUN cd apps/local-latex-compiler && go mod download

COPY apps/local-latex-compiler/ ./apps/local-latex-compiler/
COPY packages/go/build/ ./packages/go/build/
COPY packages/go/config/ ./packages/go/config/
COPY packages/go/logging/ ./packages/go/logging/
COPY packages/go/security/ ./packages/go/security/
COPY packages/go/synctex/ ./packages/go/synctex/
COPY packages/go/validation/ ./packages/go/validation/

RUN cd apps/local-latex-compiler && CGO_ENABLED=0 go build -o /local-compiler -ldflags="-s -w" ./cmd/server

FROM debian:bookworm

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    texlive-full \
    latexmk \
    perl \
    ghostscript \
    imagemagick \
    graphviz \
    asymptote \
    gnuplot \
    python3 \
    python3-pygments \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/* && \
    apt-get clean

RUN useradd -m -s /bin/bash appuser && \
    mkdir -p /tmp/treefrog-builds && \
    chown -R appuser:appuser /tmp

COPY --from=builder /local-compiler /usr/local/bin/local-compiler
RUN chmod +x /usr/local/bin/local-compiler

USER appuser

EXPOSE 8080
ENV PORT=8080
ENV COMPILER_WORKDIR=/tmp/treefrog-builds

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["/usr/local/bin/local-compiler"]