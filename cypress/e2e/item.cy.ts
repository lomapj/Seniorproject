describe("Item Detail Page", () => {
  const mockListing = {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "aaaa-bbbb-cccc-dddd",
    title: "Calculus Textbook",
    category: "Books",
    condition: "Like New",
    price: 45.0,
    status: "available",
    description: "Barely used calculus textbook for MATH 101",
    images: [
      "https://example.com/book1.jpg",
      "https://example.com/book2.jpg",
    ],
    seller_name: "John Doe",
    created_at: "2026-03-01T12:00:00Z",
  };

  beforeEach(() => {
    cy.intercept("**/rest/v1/listings?id=eq.*&select=*", {
      statusCode: 200,
      body: mockListing,
    }).as("getListing");

    cy.intercept("**/rest/v1/reviews?seller_id=eq.*&select=rating*", {
      statusCode: 200,
      body: [],
    }).as("getSellerRating");

    cy.intercept("**/rest/v1/reviews?seller_id=eq.*&select=*&order=*", {
      statusCode: 200,
      body: [],
    }).as("getSellerReviews");

    cy.visit(`/item?id=${mockListing.id}`);
  });

  it("renders item details", () => {
    cy.get("#itemTitle").should("exist");
    cy.get("#itemPrice").should("exist");
    cy.get("#itemDescription").should("exist");
  });

  it("displays seller information", () => {
    cy.get("#sellerName").should("exist");
    cy.get("#sellerInitials").should("exist");
  });

  it("shows breadcrumb navigation", () => {
    cy.get("#breadcrumbCategory").should("exist");
    cy.get("#breadcrumbTitle").should("exist");
  });

  it("has a favorite button", () => {
    cy.get("#favBtn").should("exist");
  });

  it("has message seller buttons", () => {
    cy.get("#sellerCardMsgBtn").should("exist");
    cy.get("#actionMsgBtn").should("exist");
  });

  it("shows report dialog when triggered", () => {
    cy.get("#reportReason").should("exist");
    cy.get("#reportDetails").should("exist");
    cy.get("#reportSubmitBtn").should("exist");
  });

  it("navigates to messages with correct params when clicking message button", () => {
    cy.wait("@getListing");
    cy.get("#sellerCardMsgBtn").should("have.attr", "href").and("include", "/messages");
  });
});
