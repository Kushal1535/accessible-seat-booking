/* Accessible seat booking - behaviour.
 * Pure helpers are exported for unit tests (node tests/test_logic.js);
 * DOM wiring only runs in a browser. */
(function (root) {
  'use strict';

  var ROWS = ['A', 'B', 'C', 'D', 'E'];
  var COLS = 8;
  var PRICE = 250;
  var UNAVAILABLE = ['A3', 'A4', 'B6', 'C1', 'D7', 'D8', 'E2'];

  function seatId(r, c) { return ROWS[r] + (c + 1); }

  function seatLabel(id, state) {
    return 'Row ' + id.charAt(0) + ', seat ' + id.slice(1) + ', ' + state;
  }

  function summarize(selected) {
    if (!selected.length) { return 'No seats selected.'; }
    var noun = selected.length === 1 ? ' seat' : ' seats';
    return selected.length + noun + ' selected: ' + selected.join(', ') +
      '. Total \u20B9' + selected.length * PRICE + '.';
  }

  /* Arrow-key / Home / End movement in the seat grid. Returns {r, c}. */
  function moveFocus(pos, key, rows, cols) {
    var r = pos.r, c = pos.c;
    if (key === 'ArrowRight') { c = Math.min(cols - 1, c + 1); }
    else if (key === 'ArrowLeft') { c = Math.max(0, c - 1); }
    else if (key === 'ArrowDown') { r = Math.min(rows - 1, r + 1); }
    else if (key === 'ArrowUp') { r = Math.max(0, r - 1); }
    else if (key === 'Home') { c = 0; }
    else if (key === 'End') { c = cols - 1; }
    return { r: r, c: c };
  }

  function validate(form) {
    var errors = [];
    if (!form.seats.length) {
      errors.push({ field: 'seat-grid', message: 'Select at least one seat.' });
    }
    if (!form.name.trim()) {
      errors.push({ field: 'name', message: 'Enter your full name.' });
    }
    var email = form.email.trim();
    if (!email) {
      errors.push({ field: 'email', message: 'Enter your email address.' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Enter an email address in the format name@example.com.' });
    }
    return errors;
  }

  var api = {
    ROWS: ROWS, COLS: COLS, PRICE: PRICE, UNAVAILABLE: UNAVAILABLE,
    seatId: seatId, seatLabel: seatLabel, summarize: summarize,
    moveFocus: moveFocus, validate: validate
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof document === 'undefined') { return; }

  /* ---------------- DOM wiring (browser only) ---------------- */
  var grid = document.getElementById('seat-grid');
  var status = document.getElementById('status');
  var form = document.getElementById('booking-form');
  var summaryBox = document.getElementById('error-summary');
  var summaryList = document.getElementById('error-list');
  var confirmation = document.getElementById('confirmation');
  var selected = [];
  var buttons = [];       // buttons[r][c]
  var current = { r: 0, c: 0 };

  function setRoving(r, c) {
    buttons[current.r][current.c].setAttribute('tabindex', '-1');
    current = { r: r, c: c };
    buttons[r][c].setAttribute('tabindex', '0');
  }

  function refreshSeat(btn, id) {
    var isSel = selected.indexOf(id) !== -1;
    btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
    btn.setAttribute('aria-label', seatLabel(id, isSel ? 'selected' : 'available'));
    btn.classList.toggle('is-selected', isSel);
  }

  function toggleSeat(id, btn) {
    var i = selected.indexOf(id);
    if (i === -1) { selected.push(id); } else { selected.splice(i, 1); }
    selected.sort();
    refreshSeat(btn, id);
    status.textContent = summarize(selected);   /* role="status" announces it */
  }

  function buildGrid() {
    for (var r = 0; r < ROWS.length; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'seat-row';
      buttons[r] = [];
      for (var c = 0; c < COLS; c++) {
        (function (r, c) {
          var id = seatId(r, c);
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'seat';
          btn.setAttribute('tabindex', r === 0 && c === 0 ? '0' : '-1');
          btn.dataset.id = id;
          if (UNAVAILABLE.indexOf(id) !== -1) {
            btn.classList.add('is-unavailable');
            btn.setAttribute('aria-disabled', 'true');
            btn.setAttribute('aria-label', seatLabel(id, 'unavailable'));
            btn.innerHTML = '<span aria-hidden="true">\u2715</span>';
          } else {
            btn.innerHTML = '<span aria-hidden="true" class="mark">\u2713</span>';
            refreshSeat(btn, id);
            btn.addEventListener('click', function () { toggleSeat(id, btn); });
          }
          btn.addEventListener('focus', function () { setRoving(r, c); });
          btn.addEventListener('keydown', function (e) {
            var keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
            if (keys.indexOf(e.key) === -1) { return; }
            e.preventDefault();
            var next = moveFocus({ r: r, c: c }, e.key, ROWS.length, COLS);
            buttons[next.r][next.c].focus();
          });
          buttons[r][c] = btn;
          rowEl.appendChild(btn);
        })(r, c);
      }
      grid.appendChild(rowEl);
    }
  }

  function clearErrors() {
    summaryBox.hidden = true;
    summaryList.innerHTML = '';
    ['name', 'email'].forEach(function (f) {
      var input = document.getElementById(f);
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      document.getElementById(f + '-error').textContent = '';
    });
    document.getElementById('seat-error').textContent = '';
  }

  function focusField(field) {
    if (field === 'seat-grid') { buttons[current.r][current.c].focus(); }
    else { document.getElementById(field).focus(); }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    var errors = validate({
      seats: selected,
      name: document.getElementById('name').value,
      email: document.getElementById('email').value
    });
    if (errors.length) {
      errors.forEach(function (err) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + err.field;
        a.textContent = err.message;
        a.addEventListener('click', function (ev) { ev.preventDefault(); focusField(err.field); });
        li.appendChild(a);
        summaryList.appendChild(li);
        if (err.field === 'seat-grid') {
          document.getElementById('seat-error').textContent = err.message;
        } else {
          var input = document.getElementById(err.field);
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('aria-describedby', err.field + '-error');
          document.getElementById(err.field + '-error').textContent = err.message;
        }
      });
      summaryBox.hidden = false;
      document.getElementById('error-heading').focus();   /* move focus to summary */
      return;
    }
    form.hidden = true;
    confirmation.hidden = false;
    document.getElementById('confirmation-text').textContent =
      'Booking confirmed. ' + summarize(selected) + ' A confirmation will be sent to ' +
      document.getElementById('email').value.trim() + '.';
    document.getElementById('confirmation-heading').focus();
  });

  buildGrid();
  status.textContent = summarize(selected);
})(typeof window !== 'undefined' ? window : globalThis);
