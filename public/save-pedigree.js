// Save Pedigree to My Saved Pedigrees - global function
window.__savePedigree = function(gen) {
  try {
    var e = document.getElementById('pedigree-tree-container');
    if (!e) return;
    var u = 0;
    try { var us = JSON.parse(localStorage.getItem('user') || '{}'); u = us.id || 0; } catch(ex) {}
    if (!u) { alert('Please log in to save'); return; }

    // Create modal overlay
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99998;display:flex;align-items:center;justify-content:center';

    var md = document.createElement('div');
    md.style.cssText = 'background:#FAF7F2;border:2px solid #C9B29F;border-radius:12px;width:380px;max-width:90vw;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.3)';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:#1C1C1C;padding:12px 16px;color:#FAF7F2;font-weight:700;font-size:14px';
    hdr.textContent = 'Save Pedigree';

    var body = document.createElement('div');
    body.style.cssText = 'padding:20px';

    var lbl = document.createElement('label');
    lbl.style.cssText = 'display:block;font-size:12px;font-weight:700;color:#4A4A4A;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em';
    lbl.textContent = 'Name this pedigree';

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.value = 'Pedigree ' + gen + 'G';
    inp.style.cssText = 'width:100%;padding:10px 12px;border:2px solid #C9B29F;border-radius:8px;font-size:14px;color:#1C1C1C;background:#FAFAFA;outline:none;box-sizing:border-box';

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;margin-top:16px;justify-content:flex-end';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:8px 20px;border-radius:8px;border:2px solid #C9B29F;background:transparent;color:#4A4A4A;font-weight:700;font-size:12px;cursor:pointer';
    cancelBtn.onclick = function() { ov.remove(); };

    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = 'padding:8px 20px;border-radius:8px;border:none;background:#1C1C1C;color:#FAF7F2;font-weight:700;font-size:12px;cursor:pointer';

    btns.appendChild(cancelBtn);
    btns.appendChild(saveBtn);
    body.appendChild(lbl);
    body.appendChild(inp);
    body.appendChild(btns);
    md.appendChild(hdr);
    md.appendChild(body);
    ov.appendChild(md);
    document.body.appendChild(ov);

    setTimeout(function() { inp.focus(); inp.select(); }, 100);

    ov.onclick = function(ev) { if (ev.target === ov) ov.remove(); };
    inp.onkeydown = function(ev) {
      if (ev.key === 'Enter') saveBtn.click();
      if (ev.key === 'Escape') ov.remove();
    };

    saveBtn.onclick = function() {
      var nm = inp.value.trim();
      if (!nm) { inp.style.borderColor = '#ef4444'; return; }
      ov.remove();

      // Show saving indicator
      var t = document.createElement('div');
      t.textContent = 'Saving...';
      t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1C1C1C;color:#FAF7F2;padding:8px 20px;border-radius:8px;font-size:12px;font-weight:700;z-index:99999';
      document.body.appendChild(t);

      // Capture pedigree
      import('/node_modules/html2canvas/dist/html2canvas.esm.js').catch(function() {
        return import('html2canvas');
      }).then(function(m) {
        var h = m.default;
        var tw = document.createElement('div');
        tw.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;padding:8px;width:1400px';
        var cl = e.cloneNode(true);
        cl.style.transform = 'none';
        cl.style.minWidth = 'unset';
        cl.style.width = '100%';
        tw.appendChild(cl);
        document.body.appendChild(tw);

        h(tw, { scale: 1, backgroundColor: '#FAFAFA', useCORS: true, windowWidth: 1400, logging: false }).then(function(cv) {
          document.body.removeChild(tw);
          var img = cv.toDataURL('image/jpeg', 0.7);

          fetch('/api/pedigree-folder/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u, dogName: nm, generation: gen, image: img })
          }).then(function(r) {
            t.remove();
            if (r.ok) {
              var badge = document.getElementById('saved-pedigrees-badge');
              if (badge) {
                var n = parseInt(badge.textContent || '0') + 1;
                badge.textContent = String(n);
                badge.style.display = 'flex';
              }
            }
          });
        });
      });
    };
  } catch(x) { console.error(x); }
};
