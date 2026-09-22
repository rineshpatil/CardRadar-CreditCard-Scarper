# Weekly crawler

Every Monday at 03:00 IST, EventBridge Scheduler starts a Fargate task in `ap-south-1`. The task runs the n8n workflow in `n8n/refresh-cards.json` once and exits:

1. It reads `data/sources.json` and `data/status.json` from the live site.
2. It creates the branch `crawl/<runId>` from `main`.
3. It fetches each card page, 2 seconds apart. Scripts, menus and footers are removed and the page text is fingerprinted.
4. Pages whose fingerprint changed are sent to the LLM. The LLM returns the card's fees, rates, lounges, golf, forex markup and eligibility, each with an exact quote from the page.
5. It commits one file per changed page plus `_run.json` to the crawl branch, then starts the **Intake crawl results** GitHub workflow.

The intake workflow (`scripts/intake.js`) then does the following:
- It throws away any AI answer whose quote isn't on the page.
- It opens or updates one pull request per changed card.
- It saves `data/status.json` and posts a report on the **Weekly crawl reports** issue.
- It deletes the crawl branch and redeploys the site.

## Reviewing a card pull request

- Each row shows the value on the site now, the proposed value and the quote it came from.
- ⚠️ marks large fee changes and removed benefits.
- If the AI misread something, edit `data/cards/<id>.json` in the pull request (the ✏️ button on GitHub), then merge.
- Close the pull request to reject it. The same page won't be proposed again until it changes.
- Merging publishes the values with a ✅ Verified label.

## Settings

| Variable | Where it's set | Value |
|---|---|---|
| `SITE_URL` | task definition | the CloudFront URL |
| `GITHUB_API`, `GITHUB_REPO` | task definition | `https://api.github.com`, `owner/repo` |
| `LLM_URL`, `LLM_MODEL` | task definition | NVIDIA NIM chat completions URL, `moonshotai/kimi-k2.5` |
| `LLM_API_KEY` | SSM `/cardradar/llm-api-key` | LLM key (shared with the chat) |
| `GITHUB_TOKEN` | SSM `/cardradar/github-token` | fine-grained token for this repository: Contents and Actions, read and write |

To change a task-definition value, edit `infra/cardradar.yml` and redeploy the stack. To change a secret, run:

```bash
aws ssm put-parameter --region ap-south-1 --name /cardradar/github-token --type SecureString --overwrite --value "<new token>"
```

## Run a crawl now

```bash
aws ecs run-task --region ap-south-1 --cluster <CrawlerCluster> --launch-type FARGATE --task-definition <CrawlerTaskDefinition> --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<CrawlerSecurityGroup>],assignPublicIp=ENABLED}"
```

The values in `<…>` are stack outputs (`aws cloudformation describe-stacks --region ap-south-1 --stack-name cardradar --query "Stacks[0].Outputs"`) and one of the subnet IDs the stack was deployed with. To watch a run:

```bash
aws logs tail /cardradar/crawler --region ap-south-1 --follow
```

## Edit the workflow

1. Start n8n locally:

   ```bash
   docker run -it --rm -p 5678:5678 -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false -e NODE_FUNCTION_ALLOW_BUILTIN=crypto n8nio/n8n:2.39.10
   ```

2. Open http://localhost:5678, then go to **Workflows → Import from File** and choose `n8n/refresh-cards.json`.
3. Edit, then download the workflow and overwrite `n8n/refresh-cards.json`. Keep `"id": "cardradarRefresh"`, because the container runs the workflow by that id.
4. Test the image against the fake APIs (below), then merge to `main`. The **Build crawler image** workflow pushes the new image, and the next run uses it.

## Test the image locally

In one terminal, run `node n8n/mock-apis.js`. In another:

```bash
docker build -t cardradar-crawler n8n
docker run --rm --add-host=host.docker.internal:host-gateway -e SITE_URL=http://host.docker.internal:8787 -e LLM_URL=http://host.docker.internal:8787/v1/chat/completions -e LLM_API_KEY=test -e LLM_MODEL=test -e GITHUB_API=http://host.docker.internal:8787 -e GITHUB_REPO=o/r -e GITHUB_TOKEN=test cardradar-crawler
```

Expected result:
- The container prints `Execution was successful` and exits with code 0.
- The mock prints two page fetches, two LLM calls and two committed crawl files, and three `404 GET /page/missing` lines (the retries).
- It also prints the committed run summary with 3 results, and `204 POST …/intake.yml/dispatches`.
