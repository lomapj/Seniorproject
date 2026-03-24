// Cypress E2E support file

// Prevent uncaught exceptions from failing tests
Cypress.on("uncaught:exception", () => false);

// Custom command to stub Supabase auth session
Cypress.Commands.add("stubAuth", (user?: { id: string; email: string }) => {
  const session = user
    ? {
        access_token: "fake-token",
        refresh_token: "fake-refresh",
        user: {
          id: user.id,
          email: user.email,
          user_metadata: { full_name: "Test User" },
        },
      }
    : null;

  cy.intercept("**/auth/v1/token*", {
    statusCode: 200,
    body: session ? { ...session, expires_in: 3600 } : null,
  }).as("authToken");

  cy.intercept("**/auth/v1/user", {
    statusCode: session ? 200 : 401,
    body: session ? session.user : { error: "not authenticated" },
  }).as("authUser");
});

declare global {
  namespace Cypress {
    interface Chainable {
      stubAuth(user?: { id: string; email: string }): Chainable<void>;
    }
  }
}
