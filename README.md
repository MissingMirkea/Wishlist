# My Little Wishlist

A lightweight wishlist site built with plain HTML, CSS, and JavaScript. It can be hosted on GitHub Pages without a build step or a server.

## Run it

Open `index.html` in a browser, or publish the repository with GitHub Pages:

1. Push these files to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select the branch and `/ (root)` folder, then save.

## Use the wishlist

- Visitors can browse, search, filter, sort, and open item links.
- Select **Admin** to add, edit, and remove items. Each wish can have a category, price in USD, item link, image URL, note, and featured status.
- Changes are saved in the current browser's `localStorage`.

## Storage limitation

This is a static GitHub Pages site with no server or shared database. The admin panel is not password-protected, and changes made in one browser are not published to GitHub or visible in other browsers/devices. Anyone opening the site in a new browser will see an empty list. Do not store private information in the wishlist.

The item links and image URLs need to use `http` or `https`. Images are loaded from their original hosts.
