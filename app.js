const { stripMentionsText } = require("@microsoft/teams.api");
const { App } = require("@microsoft/teams.apps");
const { LocalStorage } = require("@microsoft/teams.common");
const config = require("./config");
const { ManagedIdentityCredential } = require("@azure/identity");
const { TimesheetHandler } = require("./src/timesheet-handler");

// SDK-managed storage (kept for App internal use)
const storage = new LocalStorage();
const handler = new TimesheetHandler();

const createTokenFactory = () => {
	return async (scope, tenantId) => {
		const managedIdentityCredential = new ManagedIdentityCredential({
			clientId: process.env.CLIENT_ID,
		});
		const scopes = Array.isArray(scope) ? scope : [scope];
		const tokenResponse = await managedIdentityCredential.getToken(scopes, {
			tenantId: tenantId,
		});

		return tokenResponse.token;
	};
};

// Configure authentication using TokenCredentials
const tokenCredentials = {
	clientId: process.env.CLIENT_ID || "",
	token: createTokenFactory(),
};

const credentialOptions =
	config.MicrosoftAppType === "UserAssignedMsi" ? { ...tokenCredentials } : undefined;

// Create the app with storage
const app = new App({
	...credentialOptions,
	storage,
});

app.on("message", async (context) => {
	const activity = context.activity;
	const text = stripMentionsText(activity);
	const conversationId = activity.conversation.id;
	const messageId = activity.id;
	const userId = activity.from.id;
	const userName = activity.from.name || "Unknown User";

	const response = await handler.processMessage({
		text,
		conversationId,
		messageId,
		userId,
		userName,
	});

	if (response) {
		await context.send(response);
	}
});

app.on("membersAdded", async (context) => {
	const membersAdded = context.activity.membersAdded || [];
	for (const member of membersAdded) {
		if (member.id !== context.activity.recipient.id) {
			await context.send(
				"Welcome to the Timesheet Bot!\n\n" +
				"I help you track your work hours automatically.\n\n" +
				"Type `help` to see how to use me."
			);
		}
	}
});

module.exports = app;
