# Install the Harbor Line Gmail add-on

This folder is the shippable Gmail integration. It contains no passwords, Google account identifiers or customer data.

## What the recipient gets

- An add-on homepage inside Gmail showing status, last run and safe controls.
- A contextual card when an email is open, showing the proposed route and explanation.
- One-click correction to Bookings, Repairs, Billing or Urgent.
- Urgent acknowledgement.
- Automatic hourly processing within the add-on, plus an immediate **Run now** control. Google restricts add-on-created time triggers to no more than once per hour.
- A Google Sheet containing metadata-only audit records.
- Dry-run, shadow-label and kill-switch modes.
- No automatic replies, forwarding or deletion.

## Cost

The add-on itself has no per-message or monthly software charge. It uses Google Apps Script, Gmail and Google Sheets in the recipient's Google account. It does not call a paid AI service.

The organization may already pay for Google Workspace, and staff maintenance remains a real cost. Google quotas apply and can change. At approximately 60 emails per day, the proposed workload is far below the currently published Gmail read/write quotas for both consumer and Workspace accounts.

## Install as an unpublished test add-on

This is the quickest path for a demonstration or controlled pilot.

1. Sign in to the Google account that owns the test inbox.
2. Go to [script.google.com](https://script.google.com/) and create a new project.
3. In Project Settings, enable **Show `appsscript.json` manifest file in editor**.
4. Replace the editor's `Code.gs` with `dist/Code.gs` from this package.
5. Replace `appsscript.json` with `dist/appsscript.json` from this package.
6. In Apps Script, add the **Gmail API** advanced service if the manifest did not enable it automatically.
7. Save the project.
8. Select **Deploy → Test deployments → Install** as a Google Workspace add-on.
9. Accept the requested Gmail, Sheets and trigger permissions using the test account.
10. Open Gmail and select **Harbor Line Email Triage** from the right-hand add-on panel.
11. Select **Set up dry run**. This creates the audit Sheet and an hourly trigger without applying route labels. Testing is restricted to email carrying the `HLB/Test input` label. Use **Run now** during testing instead of waiting for the trigger.
12. Select **Run now**, inspect the add-on result and audit Sheet, then use **Enable labels** only when the dry-run behavior is acceptable.

Menu wording can vary slightly as Google changes the Apps Script editor. Google's current documentation calls these unpublished installations “developer add-ons.”

## Safe demonstration sequence

1. Use a test mailbox—not a real shared customer inbox.
2. Send four invented messages representing a booking, repair, billing question and stranded rider.
3. Apply the Gmail label `HLB/Test input` to those four messages. The safe setup creates the label if it does not already exist.
4. Run the safe setup and **Run now**.
5. Open each message and show its contextual classification card.
6. Correct one route and verify that only the Harbor Line label changes.
7. Acknowledge the urgent message.
8. Open the audit Sheet and verify that no subject, body, sender or attachment content is stored.
9. Select **Pause / kill switch** and verify the processor reports Paused.

## Shipping to an organization

For a small private rollout, hand the recipient this source package and use an account owned by the organization. For domain-wide use, the organization's Google Workspace administrator can publish it privately to that domain. A private add-on is not publicly searchable; Google's documentation says private publication is not reviewed by Google, though the organization should still review permissions and data handling.

Public Marketplace publication is unnecessary for this client scenario. It introduces additional Cloud project, listing, OAuth verification and Google review work.

## Why authorization is still unavoidable

The code can be completed and tested without the final mailbox, as it is here. However, any real Gmail integration must be authorized by the Google account whose messages it reads and labels. That is a Google security boundary, not an unfinished product feature. The recipient performs this one-time installation step; no credentials should be shipped in the package.

## Official references

- [Extend Gmail with Google Workspace add-ons](https://developers.google.com/workspace/add-ons/gmail)
- [Install and test an unpublished add-on](https://developers.google.com/workspace/add-ons/how-tos/testing-workspace-addons)
- [Publish an add-on](https://developers.google.com/workspace/add-ons/how-tos/publish-add-on-overview)
- [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)

