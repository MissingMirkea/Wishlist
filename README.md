# My Wishlist

A personal wishlist website hosted on GitHub Pages. Visitors can browse, search, filter, and sort the items. I can sign in to the admin panel to add, edit, or remove items.

The site is built with HTML, CSS, and JavaScript. Supabase stores the wishlist so changes are shared across visitors and devices. Supabase authentication and database policies restrict editing to my account; everyone else can view the list. GitHub Pages serves the website, while Supabase provides its database and sign-in.

## Current features

- Search, category filtering, status filtering, and sorting
- Priority and status tracking (`wanted`, `ordered`, and `owned`)
- Wishlist value, owned-item, and in-transit summaries
- Featured items, product links, notes, images, and EUR prices
- Owner-only add, edit, and delete controls

## Database update

If the Supabase table was created before priority and status were added, run the complete contents of `database/supabase.sql` in the Supabase SQL Editor once. The migration statements are safe for the existing table and give older rows sensible defaults.
