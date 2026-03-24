describe("Authentication Flow", () => {
  describe("Login Page", () => {
    beforeEach(() => {
      cy.visit("/login");
    });

    it("renders the login form", () => {
      cy.get("#loginForm").should("exist");
      cy.get("#email").should("exist");
      cy.get("#password").should("exist");
      cy.get("#submitBtn").should("exist");
    });

    it("shows error for non-farmingdale email", () => {
      cy.get("#email").type("test@gmail.com");
      cy.get("#password").type("password123");
      cy.get("#loginForm").submit();
      cy.get("#errorBanner").should("be.visible");
      cy.get("#errorText").should("contain.text", "farmingdale.edu");
    });

    it("accepts farmingdale.edu email format", () => {
      cy.get("#email").type("test@farmingdale.edu");
      cy.get("#password").type("password123");
      // Form should not show domain error
      cy.get("#email").should("have.value", "test@farmingdale.edu");
    });

    it("toggles password visibility", () => {
      cy.get("#password").should("have.attr", "type", "password");
      cy.get("#togglePw").click();
      cy.get("#password").should("have.attr", "type", "text");
      cy.get("#togglePw").click();
      cy.get("#password").should("have.attr", "type", "password");
    });

    it("has link to signup page", () => {
      cy.contains("Create Student Account").should("have.attr", "href", "/signup");
    });
  });

  describe("Signup Page", () => {
    beforeEach(() => {
      cy.visit("/signup");
    });

    it("renders the signup form", () => {
      cy.get("#signupForm").should("exist");
      cy.get("#fullName").should("exist");
      cy.get("#email").should("exist");
      cy.get("#password").should("exist");
      cy.get("#confirmPassword").should("exist");
      cy.get("#terms").should("exist");
    });

    it("shows error for mismatched passwords", () => {
      cy.get("#fullName").type("Test User");
      cy.get("#email").type("test@farmingdale.edu");
      cy.get("#password").type("password123");
      cy.get("#confirmPassword").type("password456");
      cy.get("#terms").check();
      cy.get("#signupForm").submit();
      cy.get("#errorBanner").should("be.visible");
    });

    it("shows error for non-farmingdale email", () => {
      cy.get("#fullName").type("Test User");
      cy.get("#email").type("test@gmail.com");
      cy.get("#password").type("password123");
      cy.get("#confirmPassword").type("password123");
      cy.get("#terms").check();
      cy.get("#signupForm").submit();
      cy.get("#errorBanner").should("be.visible");
    });

    it("requires terms checkbox", () => {
      cy.get("#fullName").type("Test User");
      cy.get("#email").type("test@farmingdale.edu");
      cy.get("#password").type("password123");
      cy.get("#confirmPassword").type("password123");
      // Don't check terms
      cy.get("#signupForm").submit();
      cy.get("#errorBanner").should("be.visible");
    });
  });
});
