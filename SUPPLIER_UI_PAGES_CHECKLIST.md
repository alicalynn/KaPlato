# Supplier UI Pages Checklist (Based on must_haves.html)

This checklist maps the supplier workflow pages needed in KaPlato to the current must-have statuses.

## 1) Supplier Listings Page
- Status: In Progress
- Purpose: Supplier manages inventory listings, pricing, stock, and minimum order quantity.
- Must-have mapping:
  - Supplier dashboard for inventory management (In Progress)
  - Supplier inventory posting with pricing and stock levels (In Progress)
  - Suppliers manage inventory listings and pricing (Incomplete)

## 2) Supplier Incoming Orders Page
- Status: In Progress
- Purpose: Supplier receives owner orders and updates status to Confirmed, Delivered, or Cancelled.
- Must-have mapping:
  - Receive and fulfill orders from carinderia owners (Incomplete)
  - Order status tracking (Pending, Confirmed, Delivered) (Incomplete)

## 3) Owner Marketplace Page
- Status: In Progress
- Purpose: Karenderia owners browse supplier listings, add to cart, and submit order.
- Must-have mapping:
  - Order supplies through supplier system (In Progress)
  - Order cart and submission system for carinderia owners (Incomplete)

## 4) Promo and Discount Tags Page
- Status: Incomplete
- Purpose: Supplier tags items with promos (example: Seasonal Deal, Bundle Price, 5% Off).
- Must-have mapping:
  - Promo and discount tagging (Incomplete)
  - Suppliers post promos (Incomplete)

## 5) Suki (Trusted Clients) Page
Status: Implemented
Purpose: Supplier marks frequent karenderia buyers as trusted clients and optionally applies preferred rates. (Implemented via favorites/trusted-clients flow)
Must-have mapping:
  - Mark regular clients as "Suki" (Implemented)
  - Owner marks trusted suppliers as "Suki" (Implemented)

## 6) Owner-Supplier Messaging Page
- Status: Incomplete
- Purpose: In-app negotiation for prices, substitutions, and delivery timing.
- Must-have mapping:
  - In-app messaging for owner-supplier communication (Incomplete)
  - In-app negotiation ("hangyo") (Incomplete)

## Quick test flow
1. Login as supplier.
2. Open Inventory Management > My Listings.
3. Add sample supplier products using the quick-start seed button.
4. Login as karenderia owner.
5. Open Inventory Management > Suppliers.
6. Add items to supply cart and submit order.
7. Return to supplier account and confirm the order in Incoming Orders.
8. Mark order as Delivered.
