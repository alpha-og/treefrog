FROM golang:1.23-bookworm AS builder

WORKDIR /build

# Copy module files first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY cmd/server/ ./cmd/server/
COPY pkg/ ./pkg/

# Build the binary with security flags
RUN CGO_ENABLED=0 go build -o /latex-server -ldflags="-s -w" ./cmd/server

# Production image
FROM debian:bookworm-slim

# Install only essential LaTeX packages to reduce attack surface
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    latexmk \
    perl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash appuser && chown -R appuser:appuser /tmp

# Copy binary from builder
COPY --from=builder /latex-server /usr/local/bin/latex-server

# Switch to non-root user
USER appuser

EXPOSE 9000
ENV PORT=9000
ENV BUILDER_WORKDIR=/tmp/treefrog-builds

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

CMD ["/usr/local/bin/latex-server"]
