(function () {
  var $ = function (id) { return document.getElementById(id); };

  /* Tema */
  var root = document.documentElement;
  try { var saved = localStorage.getItem('tema'); if (saved) root.dataset.theme = saved; } catch (e) {}
  $('theme').onclick = function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('tema', root.dataset.theme); } catch (e) {}
  };

  /* Link ativo no menu */
  if ('IntersectionObserver' in window) {
    var links = document.querySelectorAll('.links a');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('act', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('section[id]').forEach(function (s) { io.observe(s); });
  }

  /* Demonstração do fio */
  var on = false, lever = $('lever'), rep = $('rep');
  function drawWire() {
    var h = '', last = 0;
    for (var i = 1; i <= 24; i++) {
      var p = 0, isRep = i === 16 && rep.checked;
      if (on) { if (i <= 15) p = 16 - i; else if (i === 16) p = rep.checked ? 15 : 0; else p = rep.checked ? 31 - i : 0; }
      last = p;
      h += '<div class="cell' + (isRep ? ' rep' : '') + '" style="background:color-mix(in srgb,var(--red) ' + Math.round(p / 15 * 100) + '%,var(--off));color:' + (p > 7 ? 'var(--on-red)' : 'var(--muted)') + '">' + (on ? p : '') + '</div>';
    }
    h += '<div class="cell lamp' + (last > 0 ? ' on' : '') + '" style="background:' + (last > 0 ? 'var(--red)' : 'var(--off)') + '"></div>';
    $('wire').innerHTML = h;
    $('status').textContent = !on ? 'Ligue a alavanca para enviar o sinal.' : last > 0 ? 'A lâmpada acendeu: o sinal chegou ao fim.' : 'A lâmpada continua apagada: o sinal acabou antes do fim.';
  }
  lever.onclick = function () { on = !on; lever.setAttribute('aria-pressed', on); lever.textContent = 'Alavanca: ' + (on ? 'ligada' : 'desligada'); drawWire(); };
  rep.onchange = drawWire; drawWire();

  /* Componentes */
  var comps = [
    ['Poeira de redstone', 'Sinal', 'Fio que carrega o sinal. A força cai 1 por bloco, de 15 até 0.', 'Conecta todas as peças.'],
    ['Tocha de redstone', 'Fontes', 'Inverte o sinal. Apaga quando o bloco onde está fixada recebe energia.', 'Base das portas NOT e das travas.'],
    ['Alavanca', 'Fontes', 'Liga e desliga e mantém o estado até você mexer de novo.', 'Luzes e portas manuais.'],
    ['Bloco de redstone', 'Fontes', 'Fonte permanente de força 15 que pistões conseguem mover.', 'Liga sinais ao ser empurrado.'],
    ['Observador', 'Fontes', 'Emite um pulso curto quando o bloco à sua frente muda.', 'Fazendas de cana e detectores.'],
    ['Repetidor', 'Sinal', 'Renova o sinal para 15, atrasa de 1 a 4 ticks e só passa energia em um sentido.', 'Fios longos e temporizadores.'],
    ['Comparador', 'Sinal', 'Compara dois sinais ou subtrai um do outro. Também lê o conteúdo de baús e funis.', 'Detectores de item e contadores.'],
    ['Pistão', 'Ação', 'Empurra até 12 blocos. O pistão aderente também puxa o bloco de volta.', 'Portas secretas e fazendas.'],
    ['Lâmpada de redstone', 'Ação', 'Acende enquanto recebe energia, com luz forte e sem depender de combustível.', 'Iluminação controlada.'],
    ['Dispensador', 'Ação', 'Lança itens quando recebe um pulso de redstone.', 'Armadilhas e canhões de flecha.']
  ];
  var cat = 'Todos', filters = ['Todos', 'Fontes', 'Sinal', 'Ação'];
  function drawComps() {
    $('filters').innerHTML = filters.map(function (f) { return '<button class="btn sm" type="button" data-f="' + f + '" aria-pressed="' + (f === cat) + '">' + f + '</button>'; }).join('');
    $('comps').innerHTML = comps.filter(function (c) { return cat === 'Todos' || c[1] === cat; }).map(function (c) {
      return '<article data-cat="' + c[1] + '"><div class="ico" aria-hidden="true"></div><span class="tag">' + c[1] + '</span><h3>' + c[0] + '</h3><p>' + c[2] + '</p><p class="fact">' + c[3] + '</p></article>';
    }).join('');
  }
  $('filters').onclick = function (e) { var f = e.target.dataset && e.target.dataset.f; if (f) { cat = f; drawComps(); } };
  drawComps();

  /* Portas lógicas */
  var gates = {
    NOT: { f: function (a) { return +!a; }, n: 1, d: 'Inverte a entrada. Em Minecraft: prenda uma tocha na lateral de um bloco que recebe o sinal. Com energia no bloco, a tocha apaga.' },
    OR: { f: function (a, b) { return a | b; }, n: 2, d: 'Liga se pelo menos uma entrada estiver ligada. Em Minecraft: junte os dois fios no mesmo fio de saída.' },
    AND: { f: function (a, b) { return a & b; }, n: 2, d: 'Liga só se as duas entradas estiverem ligadas. Em Minecraft: inverta cada entrada com uma tocha, junte os fios e inverta de novo com uma terceira tocha.' },
    XOR: { f: function (a, b) { return a ^ b; }, n: 2, d: 'Liga só quando as entradas são diferentes. Em Minecraft: combine OR com a negação de AND.' }
  };
  var cur = 'NOT', A = 0, B = 0, tabs = $('tabs'), ab = $('a'), bb = $('b');
  tabs.innerHTML = Object.keys(gates).map(function (k) { return '<button class="btn sm" type="button" data-g="' + k + '">' + k + '</button>'; }).join('');
  function drawGate() {
    var g = gates[cur], two = g.n === 2, out = g.f(A, B);
    Array.prototype.forEach.call(tabs.children, function (t) { t.setAttribute('aria-pressed', t.dataset.g === cur); });
    ab.textContent = 'Entrada A: ' + A; ab.setAttribute('aria-pressed', !!A);
    bb.style.display = two ? '' : 'none'; bb.textContent = 'Entrada B: ' + B; bb.setAttribute('aria-pressed', !!B);
    $('bulb').className = 'bulb' + (out ? ' on' : '');
    $('outTxt').textContent = 'Saída: ' + (out ? '1 (ligada)' : '0 (desligada)');
    $('gdesc').textContent = g.d;
    var rows = two ? [[0, 0], [0, 1], [1, 0], [1, 1]] : [[0], [1]];
    $('tt').innerHTML = '<tr><th>A</th>' + (two ? '<th>B</th>' : '') + '<th>Saída</th></tr>' + rows.map(function (r) {
      var c = r[0] === A && (!two || r[1] === B) ? ' class="cur"' : '';
      return '<tr' + c + '><td>' + r[0] + '</td>' + (two ? '<td>' + r[1] + '</td>' : '') + '<td>' + g.f(r[0], r[1] || 0) + '</td></tr>';
    }).join('');
  }
  tabs.onclick = function (e) { var k = e.target.dataset && e.target.dataset.g; if (k) { cur = k; drawGate(); } };
  ab.onclick = function () { A = +!A; drawGate(); };
  bb.onclick = function () { B = +!B; drawGate(); };
  drawGate();

  /* Relógio */
  var pos = 0, timer = null, N = 8, d = $('delay');
  function drawClock() {
    var h = '';
    for (var i = 0; i < N; i++) h += '<div class="cell" style="' + (i === pos ? 'background:var(--red);color:var(--on-red)' : '') + '">' + (i === pos ? 15 : 0) + '</div>';
    $('clock').innerHTML = h;
    var t = N * d.value;
    $('dOut').textContent = d.value + (d.value > 1 ? ' ticks' : ' tick');
    $('period').textContent = 'Período: ' + t + ' ticks (' + (t / 10).toFixed(1).replace('.', ',') + ' s por volta).';
  }
  function step() { pos = (pos + 1) % N; drawClock(); }
  function restart() { clearInterval(timer); if ($('play').getAttribute('aria-pressed') === 'true') timer = setInterval(step, d.value * 100); }
  $('play').onclick = function () {
    var run = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', run); this.textContent = run ? 'Pausar' : 'Iniciar'; restart();
  };
  d.oninput = function () { drawClock(); restart(); };
  drawClock();
})();
