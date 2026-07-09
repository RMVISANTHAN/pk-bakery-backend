# PK Bakery Backend

Node.js + Express + MongoDB REST API powering the customer app, delivery app, and admin dashboard.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in real values - see ../docs/SETUP_GUIDE.md
npm run seed            # creates an admin account + sample categories/products
npm run dev              # starts on http://localhost:5000 with nodemon
```

Health check: `GET http://localhost:5000/api/health`

## Folder structure

```
src/
├── config/        MongoDB, Cloudinary, Firebase Admin setup
├── models/        Mongoose schemas (User, Product, Category, Order, Payment, Review, Coupon, DeliveryPartner)
├── controllers/    Business logic per resource
├── routes/         Express routers, mounted in server.js
├── middleware/     JWT auth (customer/admin + delivery partner), error handling
├── utils/          Token generation, order numbers, DB seed script
└── server.js        App entry point (Express + Socket.IO)
```

## Notes

- **Cart** is stored as a sub-array on the `User` document rather than its own collection, since a cart is inherently 1:1 with a user and this avoids an extra round trip on every cart mutation.
- **Live tracking** uses Socket.IO: clients `join-order` a room named `order:<id>`, and the delivery app emits `partner-location` updates that get relayed to everyone in that room.
- **Pricing** (GST rate, base delivery charge, free-delivery threshold) is currently hardcoded as constants in `orderController.js` — move these to a `Settings` collection or env vars before going live so the admin can tune them without a redeploy.
- Full endpoint reference: see `../docs/API_DOCUMENTATION.md`.
