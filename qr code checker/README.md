# Gatehouse

A small browser app for creating guest passes and checking people in at a movie hall door.

## Run it

Open this folder in VS Code Live Server, or run `python -m http.server 8000` from this directory and visit `http://localhost:8000`. Camera scanning needs `localhost` or HTTPS and browser camera permission. The QR generator and camera scanner load from public CDNs, so an internet connection is needed for those features. Booking-reference lookup can be used without a camera.

## Flow

1. Choose the group size and enter each guest’s name, age, gender, and city.
2. Create the pass, then save or print its QR code.
3. Open **Door scanner**, scan the pass for each person, and confirm each admission.
4. Each confirmation admits the next guest on the list. Once everyone is checked in, the pass is full.

The QR code contains only the booking reference. Guest details, bookings, and check-ins are stored in this browser’s local storage. This is a single-device demo: a pass created on one browser will not be available on another device, and local browser storage is not a secure production ticketing database. A shared, tamper-resistant entry system needs a server-side booking store and check-in endpoint.
