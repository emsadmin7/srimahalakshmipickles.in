# Sri Mahalakshmi Pickles & Spices — Online Ordering Website

A full website + backend for an Andhra pickle and podi business:

- Customer site with 28 products split into **Pickles** and **Podi & Karam** sections
- Weight selector (500g / 1kg / 2kg), quantity +/− controls, live price
- Cart drawer, checkout form (name, phone, house no., area, pincode)
- **Order on WhatsApp** button — opens WhatsApp with the order pre-filled
- **Place order on website** button — COD, UPI, Paytm, PhonePe payment options
- Admin console (password protected) with:
  - Live order feed, filter by status, mark Pending/Confirmed/Delivered, revenue stats
  - Full product management — add new products, edit name/price/description, upload or remove photos, delete products
  - Settings tab to change the admin password (saved permanently, no code edits needed)

## 1. Requirements

- [Node.js](https://nodejs.org) version 18 or newer

## 2. Setup

```bash
cd sri-mahalakshmi-pickles
npm install
npm start
```

The site runs at **http://localhost:3000**
The admin console runs at **http://localhost:3000/admin/**

Default admin password: `mahalakshmi123`

You can change the password two ways:
1. **From the admin console itself** — log in, go to the **Settings** tab, and set a new password. This is the easiest way and is saved permanently in `data/admin.json` (a hashed password, not plain text).
2. Or set an environment variable before starting the server (only used until you set a password via Settings):

```bash
ADMIN_PASSWORD=your_new_password npm start
```

## 3. Before you go live — edit these

**Contact & payment details** — open `public/js/main.js` and edit the `CONFIG` block at the top:

```js
const CONFIG = {
  businessName: 'Sri Mahalakshmi Pickles & Spices',
  phones: ['8790387333', '6281245345'],
  whatsappNumber: '918790387333',   // country code + number, no + or spaces
  upiId: 'srimahalakshmi.pickles@upi', // <-- put your real UPI ID here
  paytmNumber: '8790387333',
  phonepeNumber: '8790387333',
};
```

**Products, descriptions & prices** — edit `data/products.json`. Each product has a
`price500` (price for 500g); 1kg and 2kg prices are calculated automatically
(1kg ≈ 1.9×, 2kg ≈ 3.6× the 500g price) in both `server/server.js` and
`public/js/main.js` — the `priceForWeight()` function.

**Admin password** — see step 2 above, or edit `ADMIN_PASSWORD` directly in
`server/server.js`.

**Product photos** — the site currently uses simple drawn jar/bowl icons so it
works immediately with no external images. To use real photos, add an `<img>`
inside `.card-media` in `public/js/main.js` (`cardTemplate` function) pointing
to images placed in `public/images/`.

## 4. Buying a domain / subdomain and going live

1. Buy a domain (or a subdomain of one you own) from any registrar
   (GoDaddy, Namecheap, Hostinger, BigRock, etc.).
2. Get a small server/hosting plan that runs Node.js — e.g. Render, Railway,
   a VPS (DigitalOcean/AWS Lightsail), or shared Node hosting.
3. Upload this project, run `npm install` then `npm start` (or use a process
   manager like `pm2 start server/server.js`).
4. Point your domain/subdomain's DNS to the hosting provider, as instructed
   by that provider.
5. (Recommended) put the site behind HTTPS — most hosts provide a free
   SSL certificate automatically, or use Cloudflare.

## 5. How orders are stored

Every order — whether placed via WhatsApp or the website — is saved to
`data/orders.json` and shown in the admin console. This is a simple file-based
store, good for a single small business. If order volume grows a lot, this
file can later be swapped for a real database (e.g. SQLite, MongoDB) inside
`server/server.js` without changing the frontend.

## 6. Project structure

```
sri-mahalakshmi-pickles/
├── data/
│   ├── products.json      ← product catalogue (edit here)
│   └── orders.json        ← orders placed by customers (auto-created)
├── public/
│   ├── index.html         ← customer-facing website
│   ├── css/style.css
│   ├── js/main.js         ← storefront logic + CONFIG block
│   └── admin/             ← admin console
│       ├── index.html
│       ├── admin.css
│       └── admin.js
├── server/
│   └── server.js          ← Express backend + API
├── package.json
└── README.md
```

Enjoy, and good luck with the business! 🌿🫙
