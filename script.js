<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="theme-color" content="#1a001a" />
  <title>moonleia</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Pacifico&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background: radial-gradient(#0a0a0a, #1a001a);
      color: #f8f8ff;
      margin: 0;
      padding: 0;
      text-align: center;
    }

    .logo img {
      width: 150px;
      margin-top: 20px;
      border-radius: 50%;
      border: 3px solid #a855f7;
      box-shadow: 0 0 15px #a855f7aa;
    }

    h1 {
      font-family: 'Pacifico', cursive;
      font-size: 3rem;
      margin: 10px 0;
      color: #d8b4fe;
      text-shadow: 0 0 12px #a855f7aa;
    }

    .theme-btn {
      margin: 10px;
      padding: 12px 24px;
      border-radius: 20px;
      background: linear-gradient(to right, #a855f7, #9333ea);
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      box-shadow: 0 4px 15px #a855f755;
      transition: all 0.3s ease;
    }

    .theme-btn:hover {
      opacity: 0.9;
    }

    .book-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      padding: 20px;
    }

    .hidden {
      display: none !important;
    }

    #login-container {
      padding: 40px;
      max-width: 400px;
      margin: 30px auto;
      background: #3c0059;
      border-radius: 15px;
      box-shadow: 0 0 20px #a855f755;
    }

    #login-container input {
      width: 100%;
      padding: 12px;
      margin-bottom: 15px;
      border: none;
      border-radius: 10px;
      background: #2d033b;
      color: #fff;
      font-size: 1rem;
    }

    #login-container input::placeholder {
      color: #ccc;
    }

    .reader-header select,
    #timeInput {
      padding: 10px;
      border-radius: 8px;
      border: none;
      background: #2d033b;
      color: white;
      font-size: 1rem;
      margin: 5px;
    }

    .reader-content {
      background: #2c0036;
      margin: auto;
      max-width: 700px;
      padding: 20px;
      border-radius: 10px;
      height: 400px;
      overflow-y: auto;
      text-align: left;
    }

    .discord-btn img {
      width: 40px;
      position: absolute;
      top: 10px;
      right: 10px;
      filter: drop-shadow(0 0 5px #a855f7aa);
    }

    .leiacheat-notification {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #9333ea;
      color: #fff;
      padding: 10px 20px;
      border-radius: 10px;
      box-shadow: 0 0 10px #a855f7aa;
      z-index: 9999;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <a href="https://discord.gg/cQSyChU7wX" target="_blank" class="discord-btn" aria-label="Entrar no Discord">
    <img src="https://cdn-icons-png.flaticon.com/512/5968/5968756.png" alt="Discord" />
  </a>

  <div class="logo">
    <img src="https://cdn.discordapp.com/attachments/1383659588985032734/1384608368471183390/925aee9d-ba63-4977-97af-ec95dd20f7a1.png?ex=68545e07&is=68530c87&hm=8e03c0cfa447373cdb7086199c92fec22e9b68e2099e1cddfde6e825f398661e&" alt="Moonleia">
  </div>

  <h1>moonleia</h1>

  <!-- Login -->
  <div id="login-container">
    <input type="text" id="raInput" placeholder="Ex: 000123456789xsp">
    <div style="position: relative;">
      <input type="password" id="senhaInput" placeholder="Digite sua senha">
      <span onclick="toggleSenha()" style="
        position: absolute;
        top: 35%;
        right: 20px;
        transform: translateY(-50%);
        cursor: pointer;
        color: #ccc;
        font-size: 1.1rem;">👁️</span>
    </div>
    <button class="theme-btn" onclick="iniciarLeitura()">📖 Ler</button>
  </div>

  <!-- Configurações -->
  <button id="toggle-theme" class="theme-btn hidden">🌗 Alternar tema</button>

  <div id="config-container" class="hidden">
    <label for="timeInput">⏱️ Tempo por página (ms):</label>
    <input type="number" id="timeInput" value="1000" min="100" step="100" />
    <button id="autoButton" class="theme-btn">🚀 Autocompletar Tudo</button>
  </div>

  <!-- Livros -->
  <div id="books-container" class="book-grid hidden"></div>

  <!-- Leitor -->
  <div id="reader" class="reader-container hidden">
    <div class="reader-header">
      <select id="pages"></select>
    </div>
    <div id="conteudo" class="reader-content"></div>
  </div>

  <!-- Notificações -->
  <div id="notifications-container"></div>

  <script>
    function showNotification(msg) {
      const n = document.createElement("div");
      n.className = "leiacheat-notification";
      n.textContent = msg;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 5000);
    }

    async function iniciarLeitura() {
      const ra = document.getElementById('raInput').value.trim();
      const senha = document.getElementById('senhaInput').value.trim();

      if (!ra || !senha) {
        showNotification("❌ Preencha RA e senha corretamente.");
        return;
      }

      window.userLogin = { ra, senha };

      if (typeof startMoonLeia === 'function') {
        const success = await startMoonLeia();

        if (success) {
          document.getElementById('login-container').classList.add('hidden');
          document.getElementById('books-container').classList.remove('hidden');
          document.getElementById('config-container').classList.remove('hidden');
          document.getElementById('toggle-theme').classList.remove('hidden');
        } else {
          showNotification("❌ RA ou senha inválidos.");
        }
      } else {
        showNotification("⚠️ Função startMoonLeia não carregada.");
      }
    }

    function toggleSenha() {
      const input = document.getElementById('senhaInput');
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  </script>

  <script src="script.js"></script>
</body>
</html>
