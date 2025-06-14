async function carregarLivros() {
  const token = document.getElementById("token").value.trim();
  if (!token) return alert("Insira seu token!");

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  try {
    const res = await fetch("https://api.livros.arvore.com.br/api/v1/student/assignments", {
      method: "GET",
      headers
    });

    if (!res.ok) throw new Error("Token inválido ou erro na requisição");

    const data = await res.json();

    const livrosContainer = document.getElementById("livros");
    livrosContainer.innerHTML = "";

    const pendentes = data.assignments.filter(atv =>
      atv.status === "not_started" || atv.status === "started"
    );

    if (pendentes.length === 0) {
      livrosContainer.innerHTML = "<p>Nenhum livro pendente encontrado.</p>";
      return;
    }

    for (const livro of pendentes) {
      const div = document.createElement("div");
      div.className = "livro";

      const cover = livro.book.cover_url || "";
      const title = livro.book.title || "Livro sem título";

      div.innerHTML = `
        <img src="${cover}" alt="Capa do Livro">
        <div class="titulo">${title}</div>
        <div><button onclick="lerLivro('${livro.id}', '${token}')">📖 Ler automaticamente</button></div>
      `;

      livrosContainer.appendChild(div);
    }

  } catch (e) {
    alert("Erro ao carregar livros. Verifique o token.");
    console.error(e);
  }
}

async function lerLivro(atividadeId, token) {
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  try {
    await fetch(`https://api.livros.arvore.com.br/api/v1/student/assignments/${atividadeId}/start`, {
      method: "POST",
      headers
    });

    for (let i = 0; i < 100; i++) {
      await fetch(`https://api.livros.arvore.com.br/api/v1/student/assignments/${atividadeId}/track`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          page: i,
          seconds: 15
        })
      });
      console.log(`Página ${i} marcada como lida`);
      await new Promise(r => setTimeout(r, 500));
    }

    alert("Livro marcado como lido!");
  } catch (e) {
    alert("Erro ao tentar ler o livro.");
    console.error(e);
  }
}
