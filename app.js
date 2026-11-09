"use strict";

(() => {
  const STORAGE_KEY = "my-little-wishlist-v1";
  const grid = document.querySelector("#wishlist-grid");
  const categoryList = document.querySelector("#category-list");
  const summary = document.querySelector("#list-summary");
  const searchInput = document.querySelector("#search-input");
  const sortSelect = document.querySelector("#sort-select");
  const adminToggle = document.querySelector("#admin-toggle");
  const adminPanel = document.querySelector("#admin-panel");
  const itemForm = document.querySelector("#item-form");
  const formTitle = document.querySelector("#form-title");
  const saveButton = document.querySelector("#save-button");
  const cancelEditButton = document.querySelector("#cancel-edit");
  const formMessage = document.querySelector("#form-message");
  const adminList = document.querySelector("#admin-list");
  const adminCount = document.querySelector("#admin-count");
  const footerCount = document.querySelector("#footer-count");
  const emptyStateTemplate = document.querySelector("#empty-state-template");
  const fields = {
    name: document.querySelector("#item-name"),
    category: document.querySelector("#item-category"),
    price: document.querySelector("#item-price"),
    url: document.querySelector("#item-url"),
    image: document.querySelector("#item-image"),
    note: document.querySelector("#item-note"),
    featured: document.querySelector("#item-featured")
  };

  let wishes = loadWishes();
  let activeCategory = "All items";
  let editingId = null;
  let isAdmin = false;

  function loadWishes() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Wishlist data must be a list.");
      return parsed.filter((wish) => wish && typeof wish.id === "string" && typeof wish.name === "string");
    } catch (error) {
      console.error("Could not load the wishlist from this browser.", error);
      window.setTimeout(() => {
        window.alert("Your saved wishlist could not be read. The page will show an empty list; existing browser data has not been changed.");
      }, 0);
      return [];
    }
  }

  function saveWishes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
      formMessage.textContent = "";
      formMessage.classList.remove("error");
      return true;
    } catch (error) {
      console.error("Could not save the wishlist in this browser.", error);
      formMessage.textContent = "Could not save changes in this browser. Check available storage and try again.";
      formMessage.classList.add("error");
      return false;
    }
  }

  function safeExternalUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function escapeText(value) {
    return String(value ?? "");
  }

  function formatPrice(value) {
    if (value === "" || value === null || value === undefined) return "";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
  }

  function makeImage(url, alt) {
    const safeUrl = safeExternalUrl(url);
    const wrapper = document.createElement("div");
    wrapper.className = "card-image";
    if (safeUrl) {
      const image = document.createElement("img");
      image.src = safeUrl;
      image.alt = alt;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        wrapper.replaceChildren(makePlaceholder());
      }, { once: true });
      wrapper.append(image);
    } else {
      wrapper.append(makePlaceholder());
    }
    return wrapper;
  }

  function makePlaceholder() {
    const placeholder = document.createElement("span");
    placeholder.className = "image-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = "✦";
    return placeholder;
  }

  function renderCategories() {
    const categories = ["All items", ...new Set(wishes.map((wish) => wish.category || "Other"))];
    if (!categories.includes(activeCategory)) activeCategory = "All items";
    categoryList.replaceChildren();
    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-chip${category === activeCategory ? " active" : ""}`;
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === activeCategory));
      button.addEventListener("click", () => {
        activeCategory = category;
        render();
      });
      categoryList.append(button);
    });
  }

  function getVisibleWishes() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const visible = wishes.filter((wish) => {
      const inCategory = activeCategory === "All items" || (wish.category || "Other") === activeCategory;
      const searchable = [wish.name, wish.note, wish.category].join(" ").toLocaleLowerCase();
      return inCategory && searchable.includes(query);
    });
    const sort = sortSelect.value;
    visible.sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
      if (sort === "price-low" || sort === "price-high") {
        const first = Number.isFinite(Number(a.price)) && a.price !== "" ? Number(a.price) : Number.POSITIVE_INFINITY;
        const second = Number.isFinite(Number(b.price)) && b.price !== "" ? Number(b.price) : Number.POSITIVE_INFINITY;
        return sort === "price-low" ? first - second : second - first;
      }
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return visible;
  }

  function makeWishCard(wish) {
    const card = document.createElement("article");
    card.className = "wish-card";
    card.append(makeImage(wish.image, wish.name));

    if (wish.featured) {
      const badge = document.createElement("span");
      badge.className = "feature-badge";
      badge.textContent = "Featured";
      card.querySelector(".card-image").append(badge);
    }

    const body = document.createElement("div");
    body.className = "card-body";
    const topline = document.createElement("div");
    topline.className = "card-topline";
    const category = document.createElement("span");
    category.className = "card-category";
    category.textContent = wish.category || "Other";
    topline.append(category);
    const priceText = formatPrice(wish.price);
    if (priceText) {
      const price = document.createElement("span");
      price.className = "card-price";
      price.textContent = priceText;
      topline.append(price);
    }

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = wish.name;
    const note = document.createElement("p");
    note.className = "card-note";
    note.textContent = wish.note || "";
    body.append(topline, title, note);

    const url = safeExternalUrl(wish.url);
    if (url) {
      const link = document.createElement("a");
      link.className = "card-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(document.createTextNode("Take a look "));
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      link.append(arrow);
      body.append(link);
    }
    card.append(body);
    return card;
  }

  function renderWishlist(visible) {
    grid.replaceChildren();
    if (visible.length === 0) {
      const empty = emptyStateTemplate.content.cloneNode(true);
      if (wishes.length > 0) {
        empty.querySelector("h2").textContent = "No items found";
        empty.querySelector("p").textContent = "Try another search or category to find what you’re looking for.";
      }
      grid.append(empty);
      return;
    }
    visible.forEach((wish) => grid.append(makeWishCard(wish)));
  }

  function renderAdminList() {
    adminList.replaceChildren();
    adminCount.textContent = `${wishes.length} ${wishes.length === 1 ? "item" : "items"}`;
    if (wishes.length === 0) {
      const empty = document.createElement("div");
      empty.className = "admin-empty";
      empty.textContent = "Your list is empty. Add an item to get started.";
      adminList.append(empty);
      return;
    }

    [...wishes].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).forEach((wish) => {
      const row = document.createElement("div");
      row.className = "admin-item";
      const thumb = document.createElement("div");
      thumb.className = "admin-thumb";
      const imageUrl = safeExternalUrl(wish.image);
      if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("error", () => thumb.replaceChildren(document.createTextNode("✦")), { once: true });
        thumb.append(image);
      } else {
        thumb.textContent = "✦";
      }
      const info = document.createElement("div");
      info.className = "admin-item-info";
      const name = document.createElement("div");
      name.className = "admin-item-name";
      name.textContent = wish.name;
      const meta = document.createElement("div");
      meta.className = "admin-item-meta";
      meta.textContent = [wish.category || "Other", formatPrice(wish.price)].filter(Boolean).join(" · ");
      info.append(name, meta);

      const actions = document.createElement("div");
      actions.className = "admin-item-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "icon-button";
      edit.setAttribute("aria-label", `Edit ${wish.name}`);
      edit.title = "Edit";
      edit.textContent = "✎";
      edit.addEventListener("click", () => beginEdit(wish));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button delete";
      remove.setAttribute("aria-label", `Remove ${wish.name}`);
      remove.title = "Remove";
      remove.textContent = "×";
      remove.addEventListener("click", () => deleteWish(wish));
      actions.append(edit, remove);
      row.append(thumb, info, actions);
      adminList.append(row);
    });
  }

  function render() {
    renderCategories();
    const visible = getVisibleWishes();
    renderWishlist(visible);
    const total = wishes.length;
    summary.innerHTML = `<strong>${total}</strong> ${total === 1 ? "item" : "items"}${visible.length !== total ? ` · showing ${visible.length}` : ""}`;
    footerCount.textContent = total ? `${total} ${total === 1 ? "item" : "items"} listed` : "";
    renderAdminList();
  }

  function resetForm() {
    itemForm.reset();
    editingId = null;
    formTitle.textContent = "Add an item";
    saveButton.innerHTML = 'Save item <span aria-hidden="true">↗</span>';
    cancelEditButton.hidden = true;
    formMessage.textContent = "";
    formMessage.classList.remove("error");
  }

  function beginEdit(wish) {
    editingId = wish.id;
    fields.name.value = wish.name;
    fields.category.value = wish.category || "Other";
    fields.price.value = wish.price ?? "";
    fields.url.value = wish.url || "";
    fields.image.value = wish.image || "";
    fields.note.value = wish.note || "";
    fields.featured.checked = Boolean(wish.featured);
    formTitle.textContent = "Edit item";
    saveButton.innerHTML = 'Save changes <span aria-hidden="true">↗</span>';
    cancelEditButton.hidden = false;
    formMessage.textContent = "";
    fields.name.focus();
    adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteWish(wish) {
    if (!window.confirm(`Remove "${wish.name}" from your wishlist?`)) return;
    const previousWishes = wishes;
    wishes = wishes.filter((item) => item.id !== wish.id);
    if (!saveWishes()) {
      wishes = previousWishes;
      return;
    }
    if (editingId === wish.id) resetForm();
    render();
  }

  itemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!itemForm.reportValidity()) return;

    const name = fields.name.value.trim();
    const priceValue = fields.price.value.trim();
    const nextWish = {
      id: editingId || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      name,
      category: fields.category.value,
      price: priceValue,
      url: safeExternalUrl(fields.url.value.trim()),
      image: safeExternalUrl(fields.image.value.trim()),
      note: fields.note.value.trim(),
      featured: fields.featured.checked,
      createdAt: editingId ? wishes.find((wish) => wish.id === editingId)?.createdAt || Date.now() : Date.now()
    };

    if (fields.url.value.trim() && !nextWish.url) {
      formMessage.textContent = "Please enter a valid http or https item link.";
      formMessage.classList.add("error");
      fields.url.focus();
      return;
    }
    if (fields.image.value.trim() && !nextWish.image) {
      formMessage.textContent = "Please enter a valid http or https image link.";
      formMessage.classList.add("error");
      fields.image.focus();
      return;
    }

    const previousWishes = wishes;
    wishes = editingId
      ? wishes.map((wish) => wish.id === editingId ? nextWish : wish)
      : [nextWish, ...wishes];
    if (!saveWishes()) {
      wishes = previousWishes;
      return;
    }
    resetForm();
    render();
  });

  cancelEditButton.addEventListener("click", resetForm);
  adminToggle.addEventListener("click", () => {
    isAdmin = !isAdmin;
    adminToggle.setAttribute("aria-pressed", String(isAdmin));
    adminPanel.hidden = !isAdmin;
    if (!isAdmin) resetForm();
    else adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  searchInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);

  render();
})();
