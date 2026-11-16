# Quiz results: Google Sheets and Pipedrive

This bound Google Apps Script receives completed BACnet Studio quizzes, writes each unique session to a Google Sheet, finds or creates a Pipedrive person by exact email, and attaches the result as a Pipedrive note. Sheet storage succeeds even if Pipedrive is unavailable.

## 1. Add the script to the results sheet

1. Open the Google Sheet that will hold quiz results.
2. Select **Extensions → Apps Script**.
3. Replace the editor's `Code.gs` with [`Code.gs`](Code.gs).
4. In **Project Settings**, enable **Show `appsscript.json` manifest file in editor** and replace it with [`appsscript.json`](appsscript.json).
5. Save the project.
6. Select `setupQuizResults` in the function menu, click **Run**, and approve the requested spreadsheet and external-request permissions.

The setup function creates a `Quiz Results` tab with the expected headers. The script uses Google's `@OnlyCurrentDoc` annotation and `spreadsheets.currentonly` scope, so its spreadsheet authorization is limited to this bound workbook rather than all files in your Google Sheets account.

## 2. Configure Pipedrive without exposing its token

In Apps Script, open **Project Settings → Script Properties** and add:

| Property | Value |
|---|---|
| `PIPEDRIVE_COMPANY_DOMAIN` | Your Pipedrive company subdomain, such as `acme` for `acme.pipedrive.com` |
| `PIPEDRIVE_API_TOKEN` | The API token from your Pipedrive personal preferences |

Do not put either value in frontend code. If these properties are absent, quiz results still reach Sheets and the Pipedrive Status column reads `not_configured`.

## 3. Deploy the receiver

1. Select **Deploy → New deployment**.
2. Choose **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone**.
5. Deploy a versioned release and copy the URL ending in `/exec`.

The endpoint is public by necessity. The handler validates payload shape, rejects a honeypot value, limits payload size, and deduplicates session IDs. Quiz scores are low-stakes client results and should not be treated as proctored certification records.

## 4. Add the endpoint to GitHub Actions

Run this locally, replacing the placeholder with the deployed `/exec` URL:

```bash
gh secret set QUIZ_RESULTS_ENDPOINT \
  --repo ACE-IoT-Solutions/bacnet-planning-studio \
  --body 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
```

The Vite build injects this endpoint only when GitHub Actions builds the canonical repository. Local builds and forks retain local quiz progress but do not transmit results.

## Updating the Apps Script

After changing `Code.gs`, create a new Apps Script version and edit the existing deployment to use it. Retaining the same deployment keeps the `/exec` URL and GitHub secret unchanged.

The receiver writes structured execution-log events for every request: `received`, `stored`, `duplicate`, `pipedrive_failed`, `completed`, or `failed`. Each response and log entry includes the same request ID so a browser report can be matched to the Apps Script execution without logging the participant's email address.
