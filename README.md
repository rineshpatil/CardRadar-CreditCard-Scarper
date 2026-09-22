# 💳 CardRadar — Indian Credit Card Guide

A free guide to Indian credit cards: fees, rewards, lounge access, eligibility and more, checked against each bank's own page.
Every card shows whether its details are **verified**, **may be outdated**, or **unverified**.

- **Site:** static HTML/CSS/JS on Amazon S3 + CloudFront (`ap-south-1`)
- **Chat:** one AWS Lambda (`lambda/chat/`) behind CloudFront at `/api/chat`
- **Data:** one JSON file per card in `data/cards/`, validated by `scripts/build.js`
- **Weekly refresh:** an n8n workflow on AWS Fargate re-reads each card's page and opens a pull request when something changed ([docs/crawler.md](docs/crawler.md))

## Run it locally

Requires Node.js 22 or newer. There are no npm dependencies.

```bash
npm test      # validates the card data, then runs the tests
npm run dev   # http://localhost:3000
```

The chat needs an LLM key. Put `LLM_API_KEY=...` in a `.env` file (never commit it).

## Add or fix a card

1. Create or edit `data/cards/<id>.json`. Copy an existing card; the file name must match `id`.
2. Links must be `https:` on a domain listed in `config/allowed-domains.json`.
3. Run `npm test`. It explains any problem with the file.
4. Open a pull request. Merging to `main` deploys the site.

Leave `verification` empty for new values: the weekly crawl proposes verified values with quotes from the bank's page.

## Deploy

`main` deploys automatically through `.github/workflows/deploy.yml` (and once a day, so stale data is labelled even if nothing is pushed). AWS resources live in `infra/cardradar.yml` and are updated by hand.

First time only, in `ap-south-1`:

1. `aws ssm put-parameter --region ap-south-1 --name /cardradar/llm-api-key --type SecureString --value "<LLM API key>"`.
2. Check `aws lambda get-account-settings --region ap-south-1 --query AccountLimit.ConcurrentExecutions`; if it prints `10`, deploy with `ChatConcurrency=0`.
3. Check `aws iam list-open-id-connect-providers`; if `token.actions.githubusercontent.com` is already there, deploy with `CreateGitHubOidcProvider=false`.
4. After the stack exists, copy its outputs into the repository's Actions **variables**: `AWS_DEPLOY_ROLE_ARN`, `SITE_BUCKET`, `DISTRIBUTION_ID`, `CHAT_FUNCTION`.

Deploy or update the stack with:

```bash
aws cloudformation deploy --region ap-south-1 --stack-name cardradar --template-file infra/cardradar.yml --capabilities CAPABILITY_IAM
```

## Project structure

```
data/cards/         one JSON file per card (source of truth)
data/status.json    weekly crawl state (written by the intake workflow)
config/             allowed link domains
public/             the website (public/data/ is generated)
lambda/chat/        chat function
scripts/            build, local preview, crawl intake
n8n/                weekly crawl workflow and its container image
infra/              CloudFormation template
test/               node --test suites
```

## Disclaimer

Card details can change at any time. CardRadar is not a bank and nothing here is financial advice; confirm on the bank's website before you apply.

## License

MIT, see [LICENSE](LICENSE).
