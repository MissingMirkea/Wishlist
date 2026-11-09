"use strict";

(() => {
  const config = window.WISHLIST_SUPABASE || {};
  const grid = document.querySelector("#wishlist-grid");
  const categoryList = document.querySelector("#category-list");
  const summary = document.querySelector("#list-summary");
  const searchInput = document.querySelector("#search-input");
  const sortSelect = document.querySelector("#sort-select");
  const adminToggle = document.querySelector("#admin-toggle");
  const adminPanel = document.querySelector("#admin-panel");
  const loginForm = document.querySelector("#login-form");
  const loginMessage = document.querySelector("#login-message");
  const loginButton = document.querySelector("#login-button");
  const accessDenied = document.querySelector("#access-denied");
  const signOutButton = document.querySelector("#sign-out-button");
  const deniedSignOutButton = document.querySelector("#denied-sign-out-button");
  const ownerTools = document.querySelector("#owner-tools");
  const ownerEmail = document.querySelector("#owner-email");
  const itemForm = document.querySelector("#item-form");
  const formTitle = document.querySelector("#form-title");
  const saveButton = document.querySelector("#save-button");
  const cancelEditButton = document.querySelector("#cancel-edit");
  const formMessage = document.querySelector("#form-message");
  const adminList = document.querySelector("#admin-list");
  const adminCount = document.querySelector("#admin-count");
  const footerCount = document.querySelector("#footer-count");
  const siteStatus = document.querySelector("#site-status");
  const authStatus = document.querySelector("#auth-status");
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

  const ownerId = typeof config.ownerId === "string" ? config.ownerId.trim() : "";
  const projectUrl = typeof config.url === "string" ? config.url.trim() : "";
  const anonKey = typeof config.anonKey === "string" ? config.anonKey.trim() : "";
  function isSecretKey(key) {
    if (/^(sb_secret_|service_role)/i.test(key)) return true;
    const payload = key.split(".")[1];
    if (!payload) return false;
    try {
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
      return JSON.parse(window.atob(padded)).role === "service_role";
    } catch {
      return false;
    }
  }

  const secretKeyConfigured = isSecretKey(anonKey);
  const validConfig = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(projectUrl)
    && Boolean(anonKey)
    && !secretKeyConfigured
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId);
  const supabaseClient = validConfig && window.supabase
    ? window.supabase.createClient(projectUrl, anonKey)
    : null;

  let wishes = [];
  let activeCategory = "All items";
  let editingId = null;
  let currentUser = null;
  let isAdminOpen = false;
  let wishlistLoadError = "";

  function setMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function showSiteStatus(message, isError = false) {
    siteStatus.textContent = message;
    siteStatus.hidden = !message;
    siteStatus.classList.toggle("error", isError);
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

  function formatPrice(value) {
    if (value === "" || value === null || value === undefined) return "";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
  }

  function makePlaceholder() {
    const placeholder = document.createElement("span");
    placeholder.className = "image-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = "✦";
    return placeholder;
  }

  function makeImage(url, alt) {
    const wrapper = document.createElement("div");
    wrapper.className = "card-image";
    const safeUrl = safeExternalUrl(url);
    if (!safeUrl) {
      wrapper.append(makePlaceholder());
      return wrapper;
    }

    const image = document.createElement("img");
    image.src = safeUrl;
    image.alt = alt;
    image.loading = "lazy";
    image.addEventListener("error", () => wrapper.replaceChildren(makePlaceholder()), { once: true });
    wrapper.append(image);
    return wrapper;
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
        const first = a.price === null || a.price === "" ? Number.POSITIVE_INFINITY : Number(a.price);
        const second = b.price === null || b.price === "" ? Number.POSITIVE_INFINITY : Number(b.price);
        if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
        if (!Number.isFinite(second)) return -1;
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
    const image = makeImage(wish.image, wish.name);
    if (wish.featured) {
      const badge = document.createElement("span");
      badge.className = "feature-badge";
      badge.textContent = "Featured";
      image.append(badge);
    }
    card.append(image);

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
      if (wishlistLoadError) {
        empty.querySelector("h2").textContent = "Wishlist could not load";
        empty.querySelector("p").textContent = "The shared list is temporarily unavailable. Please try again later.";
      } else if (wishes.length > 0) {
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
    setMessage(formMessage, "");
  }

  function beginEdit(wish) {
    if (!currentUser || currentUser.id !== ownerId) return;
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
    setMessage(formMessage, "");
    fields.name.focus();
    adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setAuthView() {
    const isOwner = Boolean(currentUser && currentUser.id === ownerId);
    const signedInAsOtherUser = Boolean(currentUser && !isOwner);
    loginForm.hidden = isOwner || signedInAsOtherUser || !supabaseClient;
    accessDenied.hidden = !signedInAsOtherUser;
    ownerTools.hidden = !isOwner;
    authStatus.hidden = Boolean(supabaseClient);

    if (!supabaseClient) {
      authStatus.textContent = secretKeyConfigured
        ? "A secret/service-role key was detected. Remove it from supabase-config.js and use the publishable or anon key instead."
        : "Supabase is not configured. Add your project URL, publishable/anon key, and owner UUID to supabase-config.js.";
      authStatus.classList.add("error");
    } else if (isOwner) {
      ownerEmail.textContent = currentUser.email || "Owner account";
    } else if (signedInAsOtherUser) {
      setMessage(loginMessage, "This account is not authorized to manage this wishlist.", true);
    } else {
      setMessage(loginMessage, "");
    }
  }

  function fromDatabaseRow(row) {
    return {
      id: row.id,
      name: row.name,
      category: row.category || "Other",
      price: row.price,
      url: row.url || "",
      image: row.image || "",
      note: row.note || "",
      featured: Boolean(row.featured),
      createdAt: Date.parse(row.created_at) || 0
    };
  }

  function toDatabaseRow(wish) {
    return {
      name: wish.name,
      category: wish.category,
      price: wish.price,
      url: wish.url,
      image: wish.image,
      note: wish.note,
      featured: wish.featured
    };
  }

  async function loadWishes() {
    if (!supabaseClient) {
      wishlistLoadError = "Supabase is not configured.";
      showSiteStatus("Wishlist setup is incomplete. Follow the Supabase setup steps in README.md.", true);
      render();
      return;
    }
    const { data, error } = await supabaseClient
      .from("wishlist_items")
      .select("id,name,category,price,url,image,note,featured,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load wishlist items from Supabase.", error);
      wishlistLoadError = error.message;
      showSiteStatus("Could not load the shared wishlist. Check the Supabase project setup and try again.", true);
      render();
      return;
    }

    wishes = data.map(fromDatabaseRow);
    wishlistLoadError = "";
    showSiteStatus("");
    render();
  }

  function setBusy(button, busy, label) {
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
    if (busy) button.dataset.idleLabel = button.textContent.trim();
    else delete button.dataset.idleLabel;
    if (label) button.textContent = busy ? label : button.dataset.idleLabel || label;
  }

  async function signOut() {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("Could not sign out of Supabase.", error);
      setMessage(loginMessage, "Could not sign out. Please try again.", true);
      return;
    }
    currentUser = null;
    setAuthView();
    resetForm();
  }

  async function deleteWish(wish) {
    if (!currentUser || currentUser.id !== ownerId) {
      setMessage(formMessage, "Sign in with the owner account to make changes.", true);
      return;
    }
    if (!window.confirm(`Remove "${wish.name}" from your wishlist?`)) return;
    const { data, error } = await supabaseClient
      .from("wishlist_items")
      .delete()
      .eq("id", wish.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("Could not delete the wishlist item.", error || new Error("No item was deleted."));
      setMessage(formMessage, "Could not remove this item. Check your connection and owner access, then try again.", true);
      return;
    }
    if (editingId === wish.id) resetForm();
    await loadWishes();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      setMessage(loginMessage, "Supabase is not configured yet. See README.md for setup instructions.", true);
      return;
    }
    if (!loginForm.reportValidity()) return;

    const buttonLabel = "Sign in";
    setBusy(loginButton, true, "Signing in...");
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: loginForm.elements.email.value.trim(),
      password: loginForm.elements.password.value
    });
    setBusy(loginButton, false, buttonLabel);
    if (error) {
      console.error("Supabase sign-in failed.", error);
      setMessage(loginMessage, "Sign-in failed. Check your email and password, then try again.", true);
      return;
    }
    currentUser = data.user;
    setAuthView();
    if (currentUser?.id === ownerId) {
      loginForm.reset();
      await loadWishes();
    }
  });

  itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser || currentUser.id !== ownerId) {
      setMessage(formMessage, "Sign in with the owner account to make changes.", true);
      return;
    }
    if (!itemForm.reportValidity()) return;

    const name = fields.name.value.trim();
    const priceText = fields.price.value.trim();
    const urlInput = fields.url.value.trim();
    const imageInput = fields.image.value.trim();
    const url = safeExternalUrl(urlInput);
    const image = safeExternalUrl(imageInput);
    if (urlInput && !url) {
      setMessage(formMessage, "Please enter a valid http or https item link.", true);
      fields.url.focus();
      return;
    }
    if (imageInput && !image) {
      setMessage(formMessage, "Please enter a valid http or https image link.", true);
      fields.image.focus();
      return;
    }

    const wish = {
      name,
      category: fields.category.value,
      price: priceText ? Number(priceText) : null,
      url,
      image,
      note: fields.note.value.trim(),
      featured: fields.featured.checked
    };
    if (!Number.isFinite(wish.price) && wish.price !== null) {
      setMessage(formMessage, "Enter a valid price.", true);
      fields.price.focus();
      return;
    }

    setBusy(saveButton, true, "Saving...");
    const request = editingId
      ? supabaseClient.from("wishlist_items").update(toDatabaseRow(wish)).eq("id", editingId).select("id").maybeSingle()
      : supabaseClient.from("wishlist_items").insert(toDatabaseRow(wish)).select("id").single();
    const { data, error } = await request;
    setBusy(saveButton, false, editingId ? "Save changes" : "Save item");
    if (error || !data) {
      console.error("Could not save the wishlist item.", error || new Error("No item was saved."));
      setMessage(formMessage, "Could not save this item. Check your connection and owner access, then try again.", true);
      return;
    }
    resetForm();
    await loadWishes();
  });

  cancelEditButton.addEventListener("click", resetForm);
  adminToggle.addEventListener("click", () => {
    isAdminOpen = !isAdminOpen;
    adminToggle.setAttribute("aria-pressed", String(isAdminOpen));
    adminPanel.hidden = !isAdminOpen;
    if (!isAdminOpen) resetForm();
    else adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  signOutButton.addEventListener("click", signOut);
  deniedSignOutButton.addEventListener("click", signOut);
  searchInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);

  async function initialize() {
    setAuthView();
    if (!validConfig) {
      wishlistLoadError = "Supabase configuration is incomplete.";
      showSiteStatus("Wishlist setup is incomplete. Follow the Supabase setup steps in README.md.", true);
      render();
      return;
    }
    if (!window.supabase) {
      wishlistLoadError = "Supabase client library did not load.";
      showSiteStatus("Could not connect to Supabase. Check your internet connection and reload the page.", true);
      render();
      return;
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      setAuthView();
      if (currentUser?.id === ownerId) void loadWishes();
    });
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error("Could not restore the Supabase session.", error);
      showSiteStatus("Could not restore your sign-in session. Reload the page or sign in again.", true);
    } else {
      currentUser = data.session?.user || null;
      setAuthView();
    }
    await loadWishes();
  }

  render();
  void initialize();
})();
