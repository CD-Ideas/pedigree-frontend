// Save Pedigree to My Saved Pedigrees
window.__savePedigree = function(gen) {
  var e = document.getElementById('pedigree-tree-container');
  if (!e) return;

  var u = 0;
  try { var us = JSON.parse(localStorage.getItem('user') || '{}'); u = us.id || 0; } catch(ex) {}
  if (!u) { alert('Please log in to save'); return; }

  // Build modal
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99998;display:flex;align-items:center;justify-content:center';

  var md = document.createElement('div');
  md.style.cssText = 'background:#FAF7F2;border:2px solid #C9B29F;border-radius:12px;width:380px;max-width:90vw;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.3)';

  md.innerHTML = '<div style="background:#1C1C1C;padding:12px 16px;color:#FAF7F2;font-weight:700;font-size:14px">Save Pedigree</div>' +
    '<div style="padding:20px">' +
    '<label style="display:block;font-size:12px;font-weight:700;color:#4A4A4A;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Name this pedigree</label>' +
    '<input id="sp-input" type="text" value="Pedigree ' + gen + 'G" style="width:100%;padding:10px 12px;border:2px solid #C9B29F;border-radius:8px;font-size:14px;color:#1C1C1C;background:#FAFAFA;outline:none;box-sizing:border-box">' +
    '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">' +
    '<button id="sp-cancel" style="padding:8px 20px;border-radius:8px;border:2px solid #C9B29F;background:transparent;color:#4A4A4A;font-weight:700;font-size:12px;cursor:pointer">Cancel</button>' +
    '<button id="sp-save" style="padding:8px 20px;border-radius:8px;border:none;background:#1C1C1C;color:#FAF7F2;font-weight:700;font-size:12px;cursor:pointer">Save</button>' +
    '</div></div>';

  ov.appendChild(md);
  document.body.appendChild(ov);

  var inp = document.getElementById('sp-input');
  setTimeout(function() { inp.focus(); inp.select(); }, 100);

  ov.addEventListener('click', function(ev) { if (ev.target === ov) ov.remove(); });
  document.getElementById('sp-cancel').addEventListener('click', function() { ov.remove(); });
  inp.addEventListener('keydown', function(ev) {
    if (ev.key === 'Enter') document.getElementById('sp-save').click();
    if (ev.key === 'Escape') ov.remove();
  });

  document.getElementById('sp-save').addEventListener('click', function() {
    var nm = inp.value.trim();
    if (!nm) { inp.style.borderColor = '#ef4444'; return; }
    ov.remove();

    // Show saving text
    var saving = document.createElement('div');
    saving.textContent = 'Saving...';
    saving.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1C1C1C;color:#FAF7F2;padding:16px 32px;border-radius:12px;font-size:14px;font-weight:700;z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,0.3)';
    document.body.appendChild(saving);

    // Use html2canvas from the page's bundled version
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = function() {
      var tw = document.createElement('div');
      tw.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;padding:8px;width:1400px';
      var cl = e.cloneNode(true);
      cl.style.transform = 'none';
      cl.style.minWidth = 'unset';
      cl.style.width = '100%';
      tw.appendChild(cl);
      document.body.appendChild(tw);

      html2canvas(tw, { scale: 1, backgroundColor: '#FAFAFA', useCORS: true, windowWidth: 1400, logging: false }).then(function(cv) {
        document.body.removeChild(tw);
        var img = cv.toDataURL('image/jpeg', 0.7);

        fetch('/api/pedigree-folder/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u, dogName: nm, generation: gen, image: img })
        }).then(function(r) {
          saving.remove();
          if (r.ok) {
            window.location.href = '/dashboard/pedigrees';
          } else {
            alert('Save failed. Please try again.');
          }
        }).catch(function() {
          saving.remove();
          alert('Save failed. Please try again.');
        });
      });
    };
    document.head.appendChild(script);
  });
};
