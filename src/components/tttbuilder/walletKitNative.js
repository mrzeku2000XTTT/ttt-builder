// Native TTT Kaspa wallet source injected into every generated app.
// Same protocol as Terra: the app CREATES/IMPORTS a real Kaspa wallet in the
// browser (BIP39 seed -> m/44'/111111'/0'/0/0 -> schnorr key -> kaspa: address),
// reads balances from api.kaspa.org and signs + submits real transactions.
// No browser extension required.

export const NATIVE_WALLET_SOURCE = `/* TTT Kaspa Wallet Kit (native) KIT v3 — create, import, live balance, receive, send.
   await TTTWallet.connect();                  // load or create the native wallet
   await TTTWallet.createWallet();             // new seed phrase
   await TTTWallet.importWallet(mnemonic);
   TTTWallet.watch('kaspa:qz...');             // watch-only
   await TTTWallet.getBalance();               // KAS number
   await TTTWallet.send('kaspa:qz...', 12.5);  // returns txId
   TTTWallet.receiveQR();                      // QR image URL
   TTTWallet.onChange(cb);
*/
(function (global) {
  var API = 'https://api.kaspa.org';
  var STORE = 'ttt_kaspa_wallet';
  var CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  var REV = {};
  CHARSET.split('').forEach(function (c, i) { REV[c] = i; });

  var state = { address: null, mode: null, balance: null }; // 'native' | 'watch'
  var secret = null; // { mnemonic, privateKeyHex }
  var listeners = [];
  var libs = null;

  async function load() {
    if (libs) return libs;
    var m = await Promise.all([
      import('https://esm.sh/@noble/curves@1.4.0/secp256k1'),
      import('https://esm.sh/@noble/hashes@1.4.0/blake2b'),
      import('https://esm.sh/@scure/bip39@1.3.0'),
      import('https://esm.sh/@scure/bip39@1.3.0/wordlists/english'),
      import('https://esm.sh/@scure/bip32@1.4.0')
    ]);
    libs = { schnorr: m[0].schnorr, blake2b: m[1].blake2b, bip39: m[2], wordlist: m[3].wordlist, HDKey: m[4].HDKey };
    return libs;
  }

  function emit() { listeners.forEach(function (fn) { try { fn(getState()); } catch (e) {} }); }
  function getState() { return { address: state.address, mode: state.mode, connected: !!state.address, balance: state.balance }; }
  function normalize(a) { if (!a) return null; var s = String(a).trim().toLowerCase(); return s.indexOf('kaspa:') === 0 ? s : 'kaspa:' + s; }

  /* ---------- live balance tracking ---------- */
  var pollTimer = null;
  async function refreshBalance() {
    if (!state.address) return;
    try {
      var b = await TTTWallet.getBalance();
      if (b !== state.balance) { state.balance = b; emit(); }
    } catch (e) {}
  }
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(refreshBalance, 10000);
    refreshBalance();
  }
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
  // After a send (or expected receive) the DAG needs a moment — refresh in a burst.
  function burstRefresh() { refreshBalance(); [1500, 4000, 8000, 15000, 30000].forEach(function (t) { setTimeout(refreshBalance, t); }); }
  function isValid(a) { return /^kaspa:[a-z0-9]{60,70}$/.test(normalize(a) || ''); }

  /* ---------- bytes ---------- */
  function hexToBytes(hex) { var h = String(hex).replace(/^0x/, ''); var b = new Uint8Array(h.length / 2); for (var i = 0; i < h.length; i += 2) b[i / 2] = parseInt(h.substr(i, 2), 16); return b; }
  function bytesToHex(b) { return Array.from(b).map(function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  function cat() { var a = [].slice.call(arguments); var t = a.reduce(function (s, x) { return s + x.length; }, 0); var r = new Uint8Array(t); var o = 0; a.forEach(function (x) { r.set(x, o); o += x.length; }); return r; }
  function u8(v) { return new Uint8Array([v & 0xff]); }
  function u16(v) { return new Uint8Array([v & 0xff, (v >> 8) & 0xff]); }
  function u32(v) { var b = new Uint8Array(4); for (var i = 0; i < 4; i++) b[i] = (v >> (i * 8)) & 0xff; return b; }
  function u64(v) { var n = BigInt(v); var b = new Uint8Array(8); for (var i = 0; i < 8; i++) b[i] = Number((n >> BigInt(i * 8)) & 0xffn); return b; }

  /* ---------- address codec ---------- */
  function polymod(values) {
    var c = 1n;
    for (var i = 0; i < values.length; i++) {
      var c0 = c >> 35n;
      c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(values[i]);
      if (c0 & 0x01n) c ^= 0x98f2bc8e61n;
      if (c0 & 0x02n) c ^= 0x79b76d99e2n;
      if (c0 & 0x04n) c ^= 0xf33e5fb3c4n;
      if (c0 & 0x08n) c ^= 0xae2eabe2a8n;
      if (c0 & 0x10n) c ^= 0x1e4f43e470n;
    }
    return c ^ 1n;
  }
  function conv8to5(bytes) {
    var out = [], buff = 0, bits = 0;
    for (var i = 0; i < bytes.length; i++) {
      buff = (buff << 8) | bytes[i]; bits += 8;
      while (bits >= 5) { bits -= 5; out.push((buff >> bits) & 0x1f); buff &= (1 << bits) - 1; }
    }
    if (bits) out.push((buff << (5 - bits)) & 0x1f);
    return out;
  }
  function conv5to8(payload) {
    var out = [], buff = 0, bits = 0;
    for (var i = 0; i < payload.length; i++) {
      buff = (buff << 5) | payload[i]; bits += 5;
      while (bits >= 8) { bits -= 8; out.push((buff >> bits) & 0xff); buff &= (1 << bits) - 1; }
    }
    return out;
  }
  var PREFIX5 = 'kaspa'.split('').map(function (c) { return c.charCodeAt(0) & 0x1f; });

  function encodeAddress(pubKey32) {
    var payload5 = conv8to5(cat(new Uint8Array([0]), pubKey32));
    var chk = polymod(PREFIX5.concat([0], payload5, [0, 0, 0, 0, 0, 0, 0, 0]));
    var out = '';
    payload5.forEach(function (v) { out += CHARSET[v]; });
    for (var i = 0; i < 8; i++) out += CHARSET[Number((chk >> BigInt(5 * (7 - i))) & 0x1fn)];
    return 'kaspa:' + out;
  }
  function scriptFromAddress(addr) {
    var data = normalize(addr).split(':')[1].split('');
    var u5 = data.map(function (ch) { if (REV[ch] === undefined) throw new Error('Invalid address character: ' + ch); return REV[ch]; });
    if (polymod(PREFIX5.concat([0], u5)) !== 0n) throw new Error('Address checksum failed');
    var payload = new Uint8Array(conv5to8(u5.slice(0, u5.length - 8)));
    var pub = payload.slice(1);
    if (pub.length !== 32) throw new Error('Unsupported address type');
    var s = new Uint8Array(34); s[0] = 0x20; s.set(pub, 1); s[33] = 0xac;
    return s;
  }

  /* ---------- signing ---------- */
  var SIGKEY = new TextEncoder().encode('TransactionSigningHash');
  function kh(data) { return libs.blake2b(data, { dkLen: 32, key: SIGKEY }); }
  function hPrev(ins) { return kh(cat.apply(null, ins.reduce(function (a, i) { return a.concat([hexToBytes(i.prevTxId), u32(i.prevIndex)]); }, []))); }
  function hSeq(ins) { return kh(cat.apply(null, ins.map(function (i) { return u64(i.sequence); }))); }
  function hSig(ins) { return kh(cat.apply(null, ins.map(function (i) { return u8(i.sigOpCount); }))); }
  function hOut(outs) { return kh(cat.apply(null, outs.reduce(function (a, o) { return a.concat([u64(o.amount), u16(0), u64(BigInt(o.script.length)), o.script]); }, []))); }
  function sigHash(tx, idx) {
    var i = tx.inputs[idx];
    return kh(cat(u16(0), hPrev(tx.inputs), hSeq(tx.inputs), hSig(tx.inputs), hexToBytes(i.prevTxId), u32(i.prevIndex),
      u16(0), u64(BigInt(i.script.length)), i.script, u64(i.amount), u64(i.sequence), u8(i.sigOpCount),
      hOut(tx.outputs), u64(0n), new Uint8Array(20), u64(0n), new Uint8Array(32), u8(0x01)));
  }
  function estimateFee(nIn, nOut) {
    var fee = BigInt(nIn) * 1200n + BigInt(nOut) * 500n + 200n;
    fee = fee * 100n;
    return fee > 50000n ? fee : 50000n;
  }

  /* ---------- wallet ---------- */
  async function fromMnemonic(mnemonic) {
    var l = await load();
    if (!l.bip39.validateMnemonic(mnemonic, l.wordlist)) throw new Error('Invalid seed phrase.');
    var seed = await l.bip39.mnemonicToSeed(mnemonic);
    var key = l.HDKey.fromMasterSeed(seed).derive("m/44'/111111'/0'/0/0");
    var priv = key.privateKey;
    var pub = l.schnorr.getPublicKey(priv);
    return { mnemonic: mnemonic, privateKeyHex: bytesToHex(priv), address: encodeAddress(pub) };
  }
  function persist(w) { try { localStorage.setItem(STORE, JSON.stringify({ mnemonic: w.mnemonic, address: w.address })); } catch (e) {} }

  var TTTWallet = {
    isNative: true,

    connect: async function () {
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
      if (saved && saved.mnemonic) return await TTTWallet.importWallet(saved.mnemonic);
      return await TTTWallet.createWallet();
    },

    createWallet: async function () {
      var l = await load();
      var w = await fromMnemonic(l.bip39.generateMnemonic(l.wordlist, 128));
      secret = w; state.address = w.address; state.mode = 'native'; state.balance = null;
      persist(w); emit(); startPolling();
      return { address: w.address, mnemonic: w.mnemonic };
    },

    importWallet: async function (mnemonic) {
      var w = await fromMnemonic(String(mnemonic || '').trim());
      secret = w; state.address = w.address; state.mode = 'native'; state.balance = null;
      persist(w); emit(); startPolling();
      return { address: w.address, mnemonic: w.mnemonic };
    },

    exportMnemonic: function () { return secret ? secret.mnemonic : null; },
    exportPrivateKey: function () { return secret ? secret.privateKeyHex : null; },

    watch: function (address) {
      if (!isValid(address)) throw new Error('That is not a valid Kaspa address.');
      var a = normalize(address);
      try { scriptFromAddress(a); } catch (e) { throw new Error('Invalid Kaspa address (' + e.message + '). Copy the full kaspa:... address exactly.'); }
      secret = null; state.address = a; state.mode = 'watch'; state.balance = null; emit(); startPolling();
      return state.address;
    },

    disconnect: function () { stopPolling(); secret = null; state.address = null; state.mode = null; state.balance = null; emit(); },
    forget: function () { try { localStorage.removeItem(STORE); } catch (e) {} TTTWallet.disconnect(); },

    getState: getState,
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },

    getBalance: async function (address) {
      var addr = normalize(address || state.address);
      if (!addr) throw new Error('No wallet connected.');
      var res = await fetch(API + '/addresses/' + encodeURIComponent(addr) + '/balance');
      if (res.ok) {
        var d = await res.json();
        return Number(d.balance || 0) / 1e8;
      }
      // Some addresses 400 on /balance — fall back to summing UTXOs.
      var r2 = await fetch(API + '/addresses/' + encodeURIComponent(addr) + '/utxos');
      if (r2.ok) {
        var utxos = await r2.json();
        return (utxos || []).reduce(function (s, u) { return s + Number(u.utxoEntry.amount); }, 0) / 1e8;
      }
      var body = ''; try { body = (await res.text()).slice(0, 120); } catch (e) {}
      throw new Error('Balance lookup failed (' + res.status + (body ? ': ' + body : '') + '). Check that ' + addr.slice(0, 18) + '... is a valid mainnet address.');
    },

    refreshBalance: refreshBalance,

    getTransactions: async function (address, limit) {
      var addr = normalize(address || state.address);
      if (!addr) throw new Error('No wallet connected.');
      var res = await fetch(API + '/addresses/' + encodeURIComponent(addr) + '/full-transactions?limit=' + (limit || 10) + '&resolve_previous_outpoints=no');
      if (!res.ok) throw new Error('Transaction lookup failed (' + res.status + ')');
      return await res.json();
    },

    getPrice: async function () {
      var res = await fetch(API + '/info/price');
      if (!res.ok) throw new Error('Price lookup failed');
      return Number((await res.json()).price || 0);
    },

    send: async function (toAddress, amountKas) {
      if (state.mode !== 'native' || !secret) throw new Error('Create or import a TTT Kaspa wallet to send KAS. Watch-only wallets cannot sign.');
      if (!isValid(toAddress)) throw new Error('Invalid recipient address.');
      var amt = Number(amountKas);
      if (!(amt > 0)) throw new Error('Enter an amount greater than 0.');
      await load();

      var amount = BigInt(Math.round(amt * 1e8));
      var fromScript = scriptFromAddress(state.address);
      var toScript = scriptFromAddress(toAddress);

      var res = await fetch(API + '/addresses/' + encodeURIComponent(state.address) + '/utxos');
      if (!res.ok) throw new Error('Could not load your UTXOs (' + res.status + ')');
      var utxos = await res.json();
      if (!utxos || !utxos.length) throw new Error('No spendable funds yet. Your balance may be 0 or still confirming.');
      utxos.sort(function (a, b) { return Number(b.utxoEntry.amount) - Number(a.utxoEntry.amount); });

      var picked = [], total = 0n, target = amount + estimateFee(80, 2);
      for (var i = 0; i < utxos.length && total < target && picked.length < 80; i++) { picked.push(utxos[i]); total += BigInt(utxos[i].utxoEntry.amount); }
      var fee = estimateFee(picked.length, 2);
      if (total < amount + fee) throw new Error('Insufficient balance. Need ' + (Number(amount + fee) / 1e8).toFixed(8) + ' KAS.');

      var inputs = picked.map(function (u) {
        return { prevTxId: u.outpoint.transactionId, prevIndex: u.outpoint.index, script: fromScript, amount: BigInt(u.utxoEntry.amount), sequence: 0n, sigOpCount: 1 };
      });
      var change = total - amount - fee;
      var outputs = [{ amount: amount, script: toScript }];
      if (change > 0n) outputs.push({ amount: change, script: fromScript });

      var tx = { inputs: inputs, outputs: outputs };
      var priv = hexToBytes(secret.privateKeyHex);
      var raw = {
        version: 0,
        inputs: inputs.map(function (inp, idx) {
          var sig = libs.schnorr.sign(sigHash(tx, idx), priv);
          var script = cat(new Uint8Array(sig), new Uint8Array([0x01]));
          return {
            previousOutpoint: { transactionId: inp.prevTxId, index: inp.prevIndex },
            signatureScript: bytesToHex(cat(new Uint8Array([script.length]), script)),
            sequence: '0',
            sigOpCount: 1
          };
        }),
        outputs: outputs.map(function (o) { return { amount: o.amount.toString(), scriptPublicKey: { version: 0, scriptPublicKey: bytesToHex(o.script) } }; }),
        lockTime: '0',
        subnetworkId: '0000000000000000000000000000000000000000'
      };

      var sub = await fetch(API + '/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: raw, allowOrphan: false })
      });
      var text = await sub.text();
      if (!sub.ok) throw new Error('Transaction rejected: ' + text.slice(0, 200));
      var data; try { data = JSON.parse(text); } catch (e) { data = text; }
      burstRefresh(); // balance changes on-chain within seconds — push updates to onChange listeners
      return data.transactionId || data.txid || data;
    },

    receiveURI: function (amountKas) {
      if (!state.address) throw new Error('No wallet connected.');
      return state.address + (amountKas ? '?amount=' + amountKas : '');
    },
    receiveQR: function (amountKas, size) {
      var s = size || 240;
      return 'https://api.qrserver.com/v1/create-qr-code/?size=' + s + 'x' + s + '&data=' + encodeURIComponent(TTTWallet.receiveURI(amountKas));
    },
    isValidAddress: isValid,
    normalizeAddress: normalize,
    explorerUrl: function (txId) { return 'https://explorer.kaspa.org/txs/' + txId; }
  };

  global.TTTWallet = TTTWallet;

  /* ---- fallback "TTT Kaspa" pill (only if the app builds no widget) ---- */
  function short(a) { return a ? a.slice(0, 10) + '...' + a.slice(-4) : ''; }

  function mount() {
    if (!global.document || document.getElementById('ttt-kaspa-widget')) return;
    if (document.querySelector('[data-ttt-wallet]')) return;
    var host = document.createElement('div');
    host.id = 'ttt-kaspa-widget';
    host.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483000;font-family:system-ui,sans-serif;';
    host.innerHTML =
      '<button id="ttt-kaspa-pill" style="display:flex;align-items:center;gap:8px;background:rgba(112,199,186,.15);border:1px solid rgba(112,199,186,.45);color:#70C7BA;font-size:12px;font-weight:700;padding:7px 12px;border-radius:999px;cursor:pointer;backdrop-filter:blur(8px)">' +
      '<span style="width:7px;height:7px;border-radius:999px;background:#70C7BA;display:inline-block"></span><span id="ttt-kaspa-label">TTT Kaspa - Connect</span></button>';
    document.body.appendChild(host);

    // Centered modal overlay - always centered on any device, never overlaps the top toolbars.
    var modal = document.createElement('div');
    modal.id = 'ttt-kaspa-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);font-family:system-ui,sans-serif;padding:16px;';
    modal.innerHTML =
      '<div id="ttt-kaspa-panel" style="width:min(360px,92vw);max-height:90vh;overflow-y:auto;background:#0d1117;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px;color:#fff;font-size:12px;box-shadow:0 20px 60px rgba(0,0,0,.7);position:relative;box-sizing:border-box">' +
      '<button id="ttt-kaspa-close" style="position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;font-size:20px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>' +
      '</div>';
    document.body.appendChild(modal);

    var pill = host.querySelector('#ttt-kaspa-pill');
    var label = host.querySelector('#ttt-kaspa-label');
    var panel = modal.querySelector('#ttt-kaspa-panel');
    var closeBtn = modal.querySelector('#ttt-kaspa-close');
    var isOpen = function () { return modal.style.display === 'flex'; };
    var openModal = function () { modal.style.display = 'flex'; render(); };
    var closeModal = function () { modal.style.display = 'none'; };
    closeBtn.onclick = closeModal;
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    var inp = 'width:100%;box-sizing:border-box;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff';

    function render() {
      var s = getState();
      if (!s.connected) {
        panel.innerHTML =
          '<div style="font-weight:800;margin-bottom:10px">TTT Kaspa Wallet</div>' +
          '<button id="ttt-new" style="width:100%;padding:9px;border-radius:10px;border:0;background:#70C7BA;color:#000;font-weight:800;cursor:pointer">Create wallet</button>' +
          '<div style="margin:10px 0 6px;opacity:.5">or import a seed phrase</div>' +
          '<input id="ttt-seed" placeholder="12 word seed phrase" style="' + inp + '" />' +
          '<button id="ttt-imp" style="width:100%;margin-top:8px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;cursor:pointer">Import</button>' +
          '<div style="margin:10px 0 6px;opacity:.5">or watch an address</div>' +
          '<input id="ttt-watch" placeholder="kaspa:qz..." style="' + inp + '" />' +
          '<button id="ttt-watch-go" style="width:100%;margin-top:8px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;cursor:pointer">Watch</button>' +
          '<div id="ttt-err" style="color:#f87171;margin-top:8px;word-break:break-all"></div>';
        var err = panel.querySelector('#ttt-err');
        panel.querySelector('#ttt-new').onclick = function () {
          err.textContent = 'Creating...';
          TTTWallet.createWallet().then(function (w) { alert('Save your seed phrase:\\n\\n' + w.mnemonic); }).catch(function (e) { err.textContent = e.message; });
        };
        panel.querySelector('#ttt-imp').onclick = function () {
          err.textContent = '';
          TTTWallet.importWallet(panel.querySelector('#ttt-seed').value).catch(function (e) { err.textContent = e.message; });
        };
        panel.querySelector('#ttt-watch-go').onclick = function () {
          try { TTTWallet.watch(panel.querySelector('#ttt-watch').value); } catch (e) { err.textContent = e.message; }
        };
      } else {
        panel.innerHTML =
          '<div style="font-weight:800;margin-bottom:6px">TTT Kaspa</div>' +
          '<div style="word-break:break-all;opacity:.7;margin-bottom:10px">' + s.address + '</div>' +
          '<img src="' + TTTWallet.receiveQR(null, 180) + '" alt="QR" style="width:100%;border-radius:10px;background:#fff;padding:6px;box-sizing:border-box" />' +
          '<div style="margin-top:8px;padding:7px;border-radius:8px;background:rgba(112,199,186,.08);border:1px solid rgba(112,199,186,.2);font-size:10px;color:#70C7BA;text-align:center">Keys generated locally in this browser. Never sent to any server.</div>' +
          '<button id="ttt-copy" style="width:100%;margin-top:8px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;cursor:pointer">Copy address</button>' +
          '<button id="ttt-exp-seed" style="width:100%;margin-top:6px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;cursor:pointer">Export seed phrase</button>' +
          '<button id="ttt-exp-key" style="width:100%;margin-top:6px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;cursor:pointer">Export private key</button>' +
          '<input id="ttt-to" placeholder="Send to kaspa:qz..." style="' + inp + ';margin-top:10px" />' +
          '<input id="ttt-amt" placeholder="Amount KAS" style="' + inp + ';margin-top:6px" />' +
          '<button id="ttt-send" style="width:100%;margin-top:8px;padding:9px;border-radius:10px;border:0;background:#70C7BA;color:#000;font-weight:800;cursor:pointer">Send KAS</button>' +
          '<button id="ttt-dc" style="width:100%;margin-top:6px;padding:7px;border-radius:10px;border:0;background:transparent;color:#f87171;cursor:pointer">Disconnect</button>' +
          '<div id="ttt-err" style="margin-top:8px;color:#f87171;word-break:break-all"></div>';
        var e2 = panel.querySelector('#ttt-err');
        panel.querySelector('#ttt-copy').onclick = function () { navigator.clipboard.writeText(s.address); };
        panel.querySelector('#ttt-exp-seed').onclick = function () { var seed = TTTWallet.exportMnemonic(); if (seed) alert('Your seed phrase (keep secret, never share):\\n\\n' + seed); else alert('No seed phrase available (watch-only wallet).'); };
        panel.querySelector('#ttt-exp-key').onclick = function () { var key = TTTWallet.exportPrivateKey(); if (key) alert('Your private key (keep secret, never share):\\n\\n' + key); else alert('No private key available (watch-only wallet).'); };
        panel.querySelector('#ttt-dc').onclick = function () { TTTWallet.disconnect(); };
        panel.querySelector('#ttt-send').onclick = function () {
          e2.style.color = '#f87171'; e2.textContent = 'Signing...';
          TTTWallet.send(panel.querySelector('#ttt-to').value, panel.querySelector('#ttt-amt').value)
            .then(function (tx) { e2.style.color = '#70C7BA'; e2.innerHTML = 'Sent: <a style="color:#70C7BA" target="_blank" href="' + TTTWallet.explorerUrl(tx) + '">' + tx + '</a>'; })
            .catch(function (e) { e2.style.color = '#f87171'; e2.textContent = e.message; });
        };
      }
    }

    function refreshPill() {
      var s = getState();
      if (!s.connected) { label.textContent = 'TTT Kaspa - Connect'; return; }
      label.textContent = 'TTT Kaspa - ' + short(s.address) + (s.balance != null ? ' - ' + s.balance.toFixed(2) + ' KAS' : '');
    }

    pill.onclick = function () { isOpen() ? closeModal() : openModal(); };
    TTTWallet.onChange(function () { refreshPill(); if (isOpen()) render(); });
    refreshPill();
  }

  if (global.document) {
    var boot = function () { setTimeout(mount, 2000); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : this);
`;