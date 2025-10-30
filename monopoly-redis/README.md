# Redis Service

Redis instance voor Monopoly game state storage.

## Deployment

Railway zal deze service automatisch detecteren en deployen vanuit deze folder.

## Configuration

- **Port**: 6379 (internal)
- **Protected mode**: Disabled (binnen Railway private network)
- **Persistence**: Disabled (in-memory only)

## Connection

Andere services kunnen verbinden via:
- Internal hostname: `${{monopoly-redis.RAILWAY_PRIVATE_DOMAIN}}`
- Port: 6379

Example:
```bash
redis-cli -h monopoly-redis.railway.internal -p 6379
```

