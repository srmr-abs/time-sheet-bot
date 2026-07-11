# RSC Investigation Summary

## Objective

Verify whether the Microsoft Teams bot can receive and respond to messages **without `@bot` mention** using **Resource-Specific Consent (RSC)**.

---

## Work Completed

- Verified that the bot application starts successfully on **localhost:3978**.
- Confirmed that `npm run dev:teamsfx` runs successfully.
- Updated the `manifest.json` with the required **RSC permissions**.
- Uploaded the Teams app package manually for testing.
- Configured and tested **ngrok** successfully.
- Verified that the ngrok URL reaches the local application (`Cannot GET /api/messages`), confirming the tunnel is working.

---

## Investigation Performed

- Tested bot response using:
  - `@LogTrackerDev hi`
  - `hi` (without mention)
- Checked whether requests reached the local bot - After added in teams, the response is not reaching the bot.
- Added logging in the bot application (`app.js`) to verify incoming requests.
- Verified ngrok traffic using the ngrok inspection page.
- Reviewed Microsoft 365 Agents Toolkit configuration - When pressing f5 the debug starts to work and request from teams able to reach the bot and reply also receiving to teams.

---

## Observations

- No requests reached the local bot once it added to teams.
- No incoming requests appeared in the ngrok inspector.
- No logs were generated in `app.js`.
- Even `@LogTrackerDev hi` did not invoke the bot.

---

## Conclusion

The issue is **not related to the bot business logic**.

The remaining blocker appears to be the **connection between Microsoft Teams and the bot endpoint** (Messaging Endpoint/Bot Registration managed by the Microsoft 365 Agents Toolkit).

Since Teams never forwarded requests to the local endpoint, the bot application was never invoked, making it impossible to validate the RSC functionality.

---

## Current Status

**Task could not be validated due to environment/configuration issues rather than application logic.**

Further investigation into the Microsoft 365 Agents Toolkit provisioning and bot endpoint configuration would be required to continue.

---

## Recommendation

As the issue is related to the development environment and bot endpoint configuration rather than the implementation, it is recommended to **close this investigation for now** and proceed with an alternative implementation approach (such as the Power Automate + SharePoint or webhook-based approach discussed earlier).

## Notes:
The can be able to done by using power automate itself, the thing we decided to more for some other approach is , difficult to handle complex logic in power automate.
