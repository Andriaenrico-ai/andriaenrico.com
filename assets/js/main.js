/* Solo effetti grafici: nessun cookie, nessuna richiesta esterna, nessun dato del visitatore. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = motion.matches;

  function setupReveal() {
    var items = document.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          seen.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { seen.observe(el); });
  }

  function offsetOf(el) {
    var x = 0, y = 0, node = el;
    while (node && node !== document.body) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x: x, y: y };
  }

  function setupHero() {
    var hero = document.querySelector('.hero');
    var canvas = document.querySelector('.hero__fx');
    if (!hero || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    root.classList.add('fx');

    var steps = hero.querySelectorAll('.cascade li');
    var cream = '246,241,231', amber = '236,190,124';
    var W = 0, H = 0, line = [], dust = [], amberFrom = 1;
    var t0 = null, frameId = 0, visible = true;
    var mouse = { x: -9999, y: -9999 };
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function build() {
      W = hero.clientWidth;
      H = hero.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var origin = offsetOf(hero), segments = [], total = 0;
      steps.forEach(function (li, i) {
        var p = offsetOf(li);
        var x = p.x - origin.x + 0.5, y = p.y - origin.y, bottom = y + li.offsetHeight;
        segments.push([x, y, x, bottom]);
        if (i === steps.length - 1) amberFrom = total;
        total += bottom - y;
        var next = steps[i + 1];
        if (next) {
          var nx = offsetOf(next).x - origin.x + 0.5;
          segments.push([x, bottom, nx, bottom]);
          total += nx - x;
        }
      });
      amberFrom = total ? amberFrom / total : 1;

      var count = Math.min(Math.round(total / 1.05), 1400);
      line = [];
      for (var i = 0; i < count; i++) {
        var s = i / count, dist = s * total, k = 0;
        while (k < segments.length - 1) {
          var seg = segments[k], len = Math.abs(seg[2] - seg[0]) + Math.abs(seg[3] - seg[1]);
          if (dist <= len) break;
          dist -= len;
          k++;
        }
        var g = segments[k], l = Math.abs(g[2] - g[0]) + Math.abs(g[3] - g[1]) || 1, f = dist / l;
        line.push({
          s: s,
          tx: g[0] + (g[2] - g[0]) * f,
          ty: g[1] + (g[3] - g[1]) * f,
          sx: Math.random() * W,
          sy: Math.random() * H,
          swirl: (Math.random() - 0.5) * 120,
          size: 0.8 + Math.random() * 0.9,
          phase: Math.random() * 6.28
        });
      }

      var dustCount = Math.min(Math.round(W * H / 7000), 190);
      dust = [];
      for (var d = 0; d < dustCount; d++) {
        dust.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 7,
          vy: -2 - Math.random() * 6,
          size: 0.6 + Math.random() * 1.1,
          alpha: 0.08 + Math.random() * 0.26,
          phase: Math.random() * 6.28
        });
      }
    }

    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    function draw(t, dt) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      ctx.fillStyle = 'rgb(' + cream + ')';
      dust.forEach(function (p) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -4) p.y = H + 4;
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
        ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(t * 0.9 + p.phase));
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      var pulse = t > 4 ? ((t - 4) / 5) % 1 : -1;
      var colour = '';
      line.forEach(function (p) {
        var d = clamp((t - 0.2 - p.s * 1.7) / 1.5);
        var e = 1 - Math.pow(2, -9 * d);
        var bend = Math.sin(d * 3.14) * p.swirl;
        var x = p.sx + (p.tx - p.sx) * e + bend;
        var y = p.sy + (p.ty - p.sy) * e - bend * 0.5;
        if (d >= 1) {
          x += Math.sin(t * 1.4 + p.phase) * 0.5;
          y += Math.cos(t * 1.1 + p.phase) * 0.5;
        }
        var dx = x - mouse.x, dy = y - mouse.y, m = dx * dx + dy * dy;
        if (m < 8100) {
          var r = Math.sqrt(m) || 1, push = (1 - r / 90) * 20;
          x += dx / r * push;
          y += dy / r * push;
        }
        var alpha = 0.16 + 0.62 * e, gold = p.s >= amberFrom, size = p.size;
        if (pulse >= 0) {
          var gap = Math.abs(p.s - pulse);
          if (gap < 0.05) {
            var boost = 1 - gap / 0.05;
            alpha = Math.min(1, alpha + boost * 0.6);
            size += boost * 1.3;
            gold = true;
          }
        }
        var wanted = gold ? amber : cream;
        if (wanted !== colour) {
          colour = wanted;
          ctx.fillStyle = 'rgb(' + colour + ')';
        }
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, size, size);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    var last = 0;
    function frame(now) {
      if (t0 === null) { t0 = now; last = now; }
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      draw((now - t0) / 1000, dt);
      frameId = window.requestAnimationFrame(frame);
    }
    function start() {
      if (!frameId && !reduce && visible && !document.hidden) frameId = window.requestAnimationFrame(frame);
    }
    function stop() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      last = performance.now();
    }

    function refresh() {
      build();
      if (reduce) draw(30, 0);
    }

    refresh();
    start();

    if (motion.addEventListener) {
      motion.addEventListener('change', function (ev) {
        reduce = ev.matches;
        if (reduce) { stop(); draw(30, 0); } else { start(); }
      });
    }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

    var width = window.innerWidth, timer = 0;
    window.addEventListener('resize', function () {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 180);
    });

    if (window.matchMedia('(pointer: fine)').matches) {
      hero.addEventListener('mousemove', function (ev) {
        var box = hero.getBoundingClientRect();
        mouse.x = ev.clientX - box.left;
        mouse.y = ev.clientY - box.top;
      });
      hero.addEventListener('mouseleave', function () { mouse.x = mouse.y = -9999; });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    try { setupReveal(); } catch (e) { root.classList.remove('js'); }
    try { setupHero(); } catch (e) { root.classList.remove('fx'); }
  });
})();
