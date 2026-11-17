(function () {
  "use strict";

  const STORAGE_KEY = "gatehouse.bookings.v1";
  const ACTIVITY_KEY = "gatehouse.arrivals.v1";
  const MAX_GUESTS = 20;
  let bookings = readStored(STORAGE_KEY, []);
  let arrivals = readStored(ACTIVITY_KEY, []);
  let currentBookingId = null;
  let pendingBookingId = null;
  let scanner = null;
  let toastTimer = null;

  const $ = (selector) => document.querySelector(selector);
  const bookingView = $("#bookingView");
  const scannerView = $("#scannerView");
  const guestCountInput = $("#guestCount");
  const guestFields = $("#guestFields");
  const formError = $("#formError");
  const toast = $("#toast");

  function readStored(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(value) ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(arrivals.slice(0, 30)));
      return true;
    } catch (_) {
      showToast("Could not save this pass. Check available browser storage.", true);
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
  }

  function createGuestFields(count, existing) {
    const previous = existing || collectGuests();
    guestFields.innerHTML = "";
    for (let index = 0; index < count; index += 1) {
      const guest = previous[index] || {};
      const card = document.createElement("section");
      card.className = "guest-card";
      card.innerHTML = `
        <div class="guest-card-head"><span class="guest-number">${index + 1}</span>Guest ${index + 1}</div>
        <label><span>Full name</span><input name="guestName" type="text" maxlength="70" autocomplete="off" placeholder="Guest’s name" required value="${escapeHtml(guest.name || "")}"></label>
        <div class="guest-inline">
          <label><span>Age</span><input name="guestAge" type="number" min="1" max="120" inputmode="numeric" placeholder="Age" required value="${escapeHtml(guest.age || "")}"></label>
          <label><span>Gender</span><select name="guestGender" required>
            <option value="" disabled ${guest.gender ? "" : "selected"}>Select</option>
            <option ${guest.gender === "Female" ? "selected" : ""}>Female</option>
            <option ${guest.gender === "Male" ? "selected" : ""}>Male</option>
            <option ${guest.gender === "Non-binary" ? "selected" : ""}>Non-binary</option>
            <option ${guest.gender === "Other" ? "selected" : ""}>Other</option>
            <option ${guest.gender === "Prefer not to say" ? "selected" : ""}>Prefer not to say</option>
          </select></label>
        </div>
        <label><span>City</span><input name="guestCity" type="text" maxlength="70" autocomplete="address-level2" placeholder="City" required value="${escapeHtml(guest.city || "")}"></label>`;
      guestFields.appendChild(card);
    }
  }

  function collectGuests() {
    return Array.from(guestFields.querySelectorAll(".guest-card")).map((card) => ({
      name: card.querySelector('[name="guestName"]').value.trim(),
      age: Number(card.querySelector('[name="guestAge"]').value),
      gender: card.querySelector('[name="guestGender"]').value,
      city: card.querySelector('[name="guestCity"]').value.trim()
    }));
  }

  function makeBookingId() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let index = 0; index < 6; index += 1) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `GH-${suffix}`;
  }

  function createQr(booking) {
    const mount = $("#qrCode");
    mount.innerHTML = "";
    if (!window.QRCode) {
      mount.textContent = "QR library unavailable";
      mount.classList.add("qr-error");
      showToast("QR generator did not load. Check your internet connection and refresh.", true);
      return false;
    }
    mount.classList.remove("qr-error");
    const payload = JSON.stringify({ app: "gatehouse", version: 1, bookingId: booking.id });
    new window.QRCode(mount, {
      text: payload,
      width: 166,
      height: 166,
      colorDark: "#111116",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M
    });
    return true;
  }

  function setCurrentBooking(id) {
    currentBookingId = id;
    const booking = bookings.find((item) => item.id === id);
    if (!booking) return;
    $("#emptyPass").hidden = true;
    $("#passContent").hidden = false;
    $("#passState").textContent = booking.checkIns.length >= booking.guests.length ? "FULLY ADMITTED" : "ACTIVE PASS";
    $("#passId").textContent = booking.id;
    $("#passGuestCount").textContent = `${booking.guests.length} ${booking.guests.length === 1 ? "guest" : "guests"}`;
    $("#passAdmittedCount").textContent = `${booking.checkIns.length} admitted`;
    $("#passGuestList").innerHTML = booking.guests.map((guest, index) => {
      const admitted = booking.checkIns.includes(index);
      return `<div class="pass-guest-row ${admitted ? "is-in" : ""}"><span class="guest-row-index">${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(guest.name)}</span>${admitted ? '<span class="guest-row-check" title="Checked in">✓</span>' : ""}</div>`;
    }).join("");
    createQr(booking);
  }

  function updateDashboard() {
    const guests = bookings.reduce((total, booking) => total + booking.guests.length, 0);
    const admitted = bookings.reduce((total, booking) => total + booking.checkIns.length, 0);
    $("#statBookings").textContent = String(bookings.length);
    $("#statGuests").textContent = String(guests);
    $("#statAdmitted").textContent = String(admitted);
    $("#statRemaining").textContent = `${guests - admitted} ${guests - admitted === 1 ? "guest" : "guests"} remaining`;
    $("#bookingCount").textContent = `${bookings.length} ${bookings.length === 1 ? "PASS" : "PASSES"}`;
    const body = $("#bookingsTableBody");
    body.innerHTML = bookings.slice().reverse().slice(0, 8).map((booking) => {
      const complete = booking.checkIns.length >= booking.guests.length;
      return `<tr data-booking-id="${escapeHtml(booking.id)}" tabindex="0" aria-label="Open booking ${escapeHtml(booking.id)}">
        <td>${escapeHtml(booking.id)}</td>
        <td class="guest-count-cell">${booking.guests.length} ${booking.guests.length === 1 ? "guest" : "guests"}</td>
        <td>${booking.checkIns.length} / ${booking.guests.length}</td>
        <td><span class="status-pill ${complete ? "complete" : ""}"><span class="status-dot"></span>${complete ? "Complete" : "Awaiting guests"}</span></td>
        <td aria-hidden="true">›</td></tr>`;
    }).join("");
    $("#tableEmpty").hidden = bookings.length > 0;
    $("#bookingsTableBody").parentElement.hidden = bookings.length === 0;
    if (currentBookingId) {
      const current = bookings.find((booking) => booking.id === currentBookingId);
      if (current) setCurrentBooking(currentBookingId);
    }
  }

  function renderArrivals() {
    $("#checkinCount").textContent = `${arrivals.length} ${arrivals.length === 1 ? "ARRIVAL" : "ARRIVALS"}`;
    const list = $("#arrivalList");
    if (!arrivals.length) {
      list.innerHTML = '<div class="arrival-empty">No guests checked in for this session yet.</div>';
      return;
    }
    list.innerHTML = arrivals.slice(0, 8).map((arrival) => `<div class="arrival-row"><span class="arrival-check">✓</span><div class="arrival-main"><strong>${escapeHtml(arrival.name)}</strong><small>${escapeHtml(arrival.bookingId)} · ${escapeHtml(arrival.city)}</small></div><span class="arrival-time">${escapeHtml(arrival.time)}</span></div>`).join("");
  }

  function showToast(message, isError) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("is-error", Boolean(isError));
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3300);
  }

  function switchView(view) {
    const isScanner = view === "scanner";
    bookingView.hidden = isScanner;
    scannerView.hidden = !isScanner;
    $("#navBookings").classList.toggle("is-active", !isScanner);
    $("#navScanner").classList.toggle("is-active", isScanner);
    $("#navBookings").toggleAttribute("aria-current", !isScanner);
    $("#navScanner").toggleAttribute("aria-current", isScanner);
    $("#breadcrumbCurrent").textContent = isScanner ? "Door scanner" : "Bookings";
    if (!isScanner) stopScanner();
  }

  function lookupBooking(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) {
      showToast("Enter or scan a booking reference first.", true);
      return;
    }
    let id = value;
    try {
      const decoded = JSON.parse(value);
      if (decoded && decoded.app === "gatehouse" && decoded.version === 1 && typeof decoded.bookingId === "string") id = decoded.bookingId;
      else if (decoded && decoded.bookingId) id = String(decoded.bookingId);
    } catch (_) {
      // A plain booking reference is also accepted for manual lookup.
    }
    id = id.trim().toUpperCase();
    const booking = bookings.find((item) => item.id.toUpperCase() === id);
    if (!booking) {
      $("#manualCode").value = "";
      showToast(`No booking found for “${id.slice(0, 28)}”. Use a pass created on this device.`, true);
      return;
    }
    pendingBookingId = booking.id;
    renderAdmission(booking.id);
    $("#manualCode").value = "";
    if (scanner && scanner.getState && scanner.getState() === 2) {
      try { scanner.pause(true); } catch (_) { /* Scanner may already be transitioning. */ }
    }
  }

  function renderAdmission(id) {
    const booking = bookings.find((item) => item.id === id);
    if (!booking) return;
    const checkedIn = new Set(booking.checkIns);
    const nextIndex = booking.guests.findIndex((_, index) => !checkedIn.has(index));
    $("#admissionContent").hidden = true;
    const pending = $("#pendingAdmission");
    pending.hidden = false;
    if (nextIndex < 0) {
      pending.innerHTML = `<div class="pending-done"><span class="done-check">✓</span><strong>All guests are inside</strong><p>${escapeHtml(booking.id)} has reached its limit of ${booking.guests.length} ${booking.guests.length === 1 ? "guest" : "guests"}.</p></div>`;
      showToast("This pass is fully admitted.", true);
      return;
    }
    const guest = booking.guests[nextIndex];
    const percent = (booking.checkIns.length / booking.guests.length) * 100;
    pending.innerHTML = `<div class="pending-kicker">PASS VERIFIED</div>
      <div class="pending-reference">${escapeHtml(booking.id)}</div>
      <div class="progress-track"><span style="width:${percent}%"></span></div>
      <div class="progress-caption"><span>${booking.checkIns.length} admitted</span><span>${booking.guests.length - booking.checkIns.length} remaining</span></div>
      <div class="next-guest"><span>NEXT GUEST · ${String(nextIndex + 1).padStart(2, "0")} OF ${String(booking.guests.length).padStart(2, "0")}</span><strong>${escapeHtml(guest.name)}</strong><small>${escapeHtml(guest.city)} · Age ${escapeHtml(guest.age)}</small></div>
      <button class="primary-button admit-button" type="button" id="confirmAdmissionButton">Admit this guest <span>✓</span></button>
      <span class="pending-hint">Confirm only when this person is at the door.</span>`;
    $("#confirmAdmissionButton").addEventListener("click", () => admitNextGuest(booking.id, nextIndex));
  }

  function admitNextGuest(id, expectedIndex) {
    const booking = bookings.find((item) => item.id === id);
    if (!booking) return;
    const nextIndex = booking.guests.findIndex((_, index) => !booking.checkIns.includes(index));
    if (nextIndex < 0) {
      renderAdmission(id);
      return;
    }
    if (nextIndex !== expectedIndex) {
      renderAdmission(id);
      return;
    }
    booking.checkIns.push(nextIndex);
    const guest = booking.guests[nextIndex];
    const now = new Date();
    arrivals.unshift({
      bookingId: booking.id,
      name: guest.name,
      city: guest.city,
      time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    });
    persist();
    updateDashboard();
    renderArrivals();
    renderAdmission(id);
    showToast(`${guest.name} admitted · ${booking.checkIns.length} of ${booking.guests.length}`);
    if (scanner && scanner.getState && scanner.getState() === 3) {
      try { scanner.resume(); } catch (_) { /* Scanner may have stopped. */ }
    }
  }

  async function startScanner() {
    if (!window.Html5Qrcode) {
      showToast("Scanner library did not load. Check your internet connection and refresh.", true);
      return;
    }
    if (!window.isSecureContext) {
      showToast("Camera access requires localhost or an HTTPS page.", true);
      return;
    }
    $("#startScannerButton").disabled = true;
    try {
      scanner = new window.Html5Qrcode("reader", { formatsToSupport: [window.Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      $("#reader").hidden = false;
      $("#cameraPlaceholder").hidden = true;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 210, height: 210 }, aspectRatio: 1 },
        (decodedText) => lookupBooking(decodedText),
        () => {}
      );
      $("#cameraStatus").classList.add("is-on");
      $("#cameraStatus").innerHTML = '<span class="status-dot"></span> CAMERA ON';
      $("#stopScannerButton").hidden = false;
      $("#cameraHint").textContent = "Hold the QR pass inside the frame to scan.";
    } catch (error) {
      scanner = null;
      $("#reader").hidden = true;
      $("#cameraPlaceholder").hidden = false;
      $("#cameraStatus").classList.remove("is-on");
      $("#cameraStatus").innerHTML = '<span class="status-dot"></span> CAMERA OFF';
      const message = error && error.name === "NotAllowedError" ? "Camera permission was denied. Allow access in your browser settings." : "Could not start the camera. Check browser permissions and try again.";
      showToast(message, true);
    } finally {
      $("#startScannerButton").disabled = false;
    }
  }

  async function stopScanner() {
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        await scanner.clear();
      } catch (_) { /* The scanner may already be stopped. */ }
      scanner = null;
    }
    if ($("#reader")) $("#reader").hidden = true;
    if ($("#cameraPlaceholder")) $("#cameraPlaceholder").hidden = false;
    if ($("#cameraStatus")) {
      $("#cameraStatus").classList.remove("is-on");
      $("#cameraStatus").innerHTML = '<span class="status-dot"></span> CAMERA OFF';
    }
    if ($("#stopScannerButton")) $("#stopScannerButton").hidden = true;
    if ($("#startScannerButton")) $("#startScannerButton").disabled = false;
  }

  function downloadQr() {
    const qr = $("#qrCode");
    const canvas = qr.querySelector("canvas");
    const image = qr.querySelector("img");
    const source = canvas ? canvas.toDataURL("image/png") : image && image.src;
    if (!source || source.startsWith("data:,")) {
      showToast("The QR image is not ready yet.", true);
      return;
    }
    const link = document.createElement("a");
    link.href = source;
    link.download = `${currentBookingId || "guest-pass"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function init() {
    const date = new Date();
    $("#todayLabel").textContent = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    createGuestFields(Number(guestCountInput.value), []);
    updateDashboard();
    renderArrivals();

    guestCountInput.addEventListener("change", () => {
      const count = Math.max(1, Math.min(MAX_GUESTS, Number(guestCountInput.value) || 1));
      guestCountInput.value = count;
      createGuestFields(count);
    });
    $("#decreaseGuests").addEventListener("click", () => {
      guestCountInput.value = Math.max(1, (Number(guestCountInput.value) || 1) - 1);
      createGuestFields(Number(guestCountInput.value));
    });
    $("#increaseGuests").addEventListener("click", () => {
      guestCountInput.value = Math.min(MAX_GUESTS, (Number(guestCountInput.value) || 1) + 1);
      createGuestFields(Number(guestCountInput.value));
    });

    $("#bookingForm").addEventListener("submit", (event) => {
      event.preventDefault();
      formError.hidden = true;
      const guests = collectGuests();
      const invalidGuest = guests.find((guest) => !guest.name || !guest.city || !guest.gender || !Number.isInteger(guest.age) || guest.age < 1 || guest.age > 120);
      if (invalidGuest) {
        formError.textContent = "Please complete every guest’s name, age, gender, and city. Age must be between 1 and 120.";
        formError.hidden = false;
        return;
      }
      let id = makeBookingId();
      while (bookings.some((booking) => booking.id === id)) id = makeBookingId();
      const booking = { id, guests, checkIns: [], createdAt: new Date().toISOString() };
      bookings.push(booking);
      if (!persist()) {
        bookings.pop();
        return;
      }
      setCurrentBooking(id);
      updateDashboard();
      showToast(`Guest pass ${id} is ready.`);
      if (!window.QRCode) showToast("Pass saved, but the QR library did not load. Check your connection.", true);
    });

    $("#navBookings").addEventListener("click", () => switchView("bookings"));
    $("#navScanner").addEventListener("click", () => switchView("scanner"));
    $("#startScannerButton").addEventListener("click", startScanner);
    $("#stopScannerButton").addEventListener("click", stopScanner);
    $("#manualScanForm").addEventListener("submit", (event) => {
      event.preventDefault();
      lookupBooking($("#manualCode").value);
    });
    $("#downloadPassButton").addEventListener("click", downloadQr);
    $("#printPassButton").addEventListener("click", () => window.print());
    $("#bookingsTableBody").addEventListener("click", (event) => {
      const row = event.target.closest("tr[data-booking-id]");
      if (!row) return;
      setCurrentBooking(row.dataset.bookingId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    $("#bookingsTableBody").addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest("tr[data-booking-id]");
      if (!row) return;
      event.preventDefault();
      setCurrentBooking(row.dataset.bookingId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    $("#clearDataButton").addEventListener("click", () => {
      if (!bookings.length && !arrivals.length) {
        showToast("There is no saved local data to clear.");
        return;
      }
      if (!window.confirm("Clear all bookings and check-in records saved on this device? This cannot be undone.")) return;
      bookings = [];
      arrivals = [];
      currentBookingId = null;
      pendingBookingId = null;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVITY_KEY);
      $("#emptyPass").hidden = false;
      $("#passContent").hidden = true;
      $("#passState").textContent = "READY";
      $("#admissionContent").hidden = false;
      $("#pendingAdmission").hidden = true;
      updateDashboard();
      renderArrivals();
      showToast("Local bookings and check-in records cleared.");
    });
    window.addEventListener("pagehide", () => {
      if (scanner && scanner.isScanning) scanner.stop().catch(() => {});
    });
  }

  init();
}());
