# Weekly CardRadar crawl: loads the workflow into a throwaway n8n, runs it once, then exits.
FROM n8nio/n8n:2.39.10

COPY refresh-cards.json /home/node/refresh-cards.json

# The workflow reads its settings and secrets from environment variables and hashes pages with crypto.
ENV N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
    NODE_FUNCTION_ALLOW_BUILTIN=crypto \
    N8N_DIAGNOSTICS_ENABLED=false \
    N8N_VERSION_NOTIFICATIONS_ENABLED=false

# n8n prints the whole run's data; keep the log short and pass on n8n's exit code (1 = failed run).
ENTRYPOINT ["sh", "-c", "n8n import:workflow --input=/home/node/refresh-cards.json && n8n execute --id=cardradarRefresh > /tmp/run.log 2>&1; code=$?; grep -m1 -E 'Execution was successful|Execution error' /tmp/run.log; tail -c 2000 /tmp/run.log; exit $code"]
