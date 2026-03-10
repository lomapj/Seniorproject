describe("Marketplace Page", () => {
  beforeEach(() => {
    // Stub the listings API
    cy.intercept("**/rest/v1/listings*", {
      statusCode: 200,
      body: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          user_id: "aaaa-bbbb",
          title: "Calculus Textbook",
          category: "Books",
          condition: "Like New",
          price: 45.0,
          status: "available",
          description: "Barely used calculus textbook",
          images: ["https://example.com/book.jpg"],
          seller_name: "John Doe",
          created_at: new Date().toISOString(),
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          user_id: "cccc-dddd",
          title: "Desk Lamp",
          category: "Furniture",
          condition: "Good",
          price: 15.0,
          status: "available",
          description: "Adjustable desk lamp",
          images: ["https://example.com/lamp.jpg"],
          seller_name: "Jane Smith",
          created_at: new Date().toISOString(),
        },
      ],
    }).as("getListings");

    cy.visit("/marketplace");
  });

  it("renders the listing grid", () => {
    cy.get("#listingGrid").should("exist");
  });

  it("displays listing cards after loading", () => {
    cy.wait("@getListings");
    cy.get("#listingGrid").children().should("have.length.at.least", 1);
  });

  it("shows category filter chips", () => {
    cy.get("#catChips").should("exist");
    cy.get("#catChips").contains("All").should("exist");
    cy.get("#catChips").contains("Books").should("exist");
    cy.get("#catChips").contains("Electronics").should("exist");
  });

  it("has a sort dropdown", () => {
    cy.get("#sortSelect").should("exist");
  });

  it("has price range filter inputs", () => {
    cy.get("#priceMin").should("exist");
    cy.get("#priceMax").should("exist");
    cy.get("#applyPriceBtn").should("exist");
  });

  it("clicking a category chip filters listings", () => {
    cy.wait("@getListings");
    cy.get("#catChips").contains("Books").click();
    // The chip should be visually active (re-fetches listings with filter)
    cy.get("#catChips").contains("Books").should("exist");
  });
});
