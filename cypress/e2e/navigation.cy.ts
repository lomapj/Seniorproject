describe("Navigation & Layout", () => {
  it("loads the home page", () => {
    cy.visit("/");
    cy.get("body").should("be.visible");
  });

  it("has navigation links in the layout", () => {
    cy.visit("/marketplace");
    cy.get('a[href="/marketplace"]').should("exist");
    cy.get('a[href="/messages"]').should("exist");
    cy.get('a[href="/profile"]').should("exist");
  });

  it("navigates from home to marketplace", () => {
    cy.visit("/");
    cy.get('a[href="/marketplace"]').first().click();
    cy.url().should("include", "/marketplace");
  });

  it("navigates from login to signup", () => {
    cy.visit("/login");
    cy.contains("Create Student Account").click();
    cy.url().should("include", "/signup");
  });

  it("navigates from signup to login", () => {
    cy.visit("/signup");
    cy.contains("Sign In").click();
    cy.url().should("include", "/login");
  });

  it("has unread message badge element", () => {
    cy.visit("/marketplace");
    cy.get("#msgBadge").should("exist");
  });

  it("post page exists", () => {
    cy.visit("/post");
    cy.get("body").should("be.visible");
  });
});
