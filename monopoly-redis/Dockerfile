FROM redis:7-alpine

# Expose Redis port
EXPOSE 6379

# Use default redis.conf but allow external connections
CMD ["redis-server", "--bind", "0.0.0.0", "--protected-mode", "no"]

