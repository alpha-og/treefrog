FROM golang:1.23-bookworm AS compiler
WORKDIR /build
# Copy module files first for layer caching
COPY go.mod go.sum ./
RUN go mod download
# Copy source code
COPY cmd/server/ ./cmd/server/
COPY pkg/ ./pkg/
# Build the binary with security flags and strip debug symbols
RUN CGO_ENABLED=0 go build -o /latex-server -ldflags="-s -w" ./cmd/server

# Production image with full TeX Live for complete Overleaf feature parity
FROM debian:bookworm

# Install full TeX Live and supporting tools for comprehensive LaTeX rendering
# This provides complete feature parity with Overleaf
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    # Full TeX Live distribution for comprehensive LaTeX support
    texlive-full \
    # LaTeX tools and utilities
    latexmk \
    perl \
    # Graphics and image processing
    ghostscript \
    imagemagick \
    # Diagram and visualization tools
    graphviz \
    asymptote \
    gnuplot \
    # Python for Pygments syntax highlighting and other tools
    python3 \
    python3-pygments \
    # Additional utilities
    wget \
    curl \
    git \
    # Build essentials for potential packages
    build-essential \
    && rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create non-root user with proper permissions
RUN useradd -m -s /bin/bash appuser && \
    mkdir -p /tmp/treefrog-builds && \
    chown -R appuser:appuser /tmp

# Copy binary from compiler stage
COPY --from=compiler /latex-server /usr/local/bin/latex-server
RUN chmod +x /usr/local/bin/latex-server

# Switch to non-root user
USER appuser

EXPOSE 9000
ENV PORT=9000
ENV COMPILER_WORKDIR=/tmp/treefrog-builds

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

CMD ["/usr/local/bin/latex-server"]
