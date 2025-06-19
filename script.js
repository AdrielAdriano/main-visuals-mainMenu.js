(function () {
  'use strict';

  // Estado principal
  let isRunning = false;
  let intervalTime = 1000;
  let currentPageIndex = 0;
  let pages = [];
  let currentBookSlug = null;
  let isAutoMode = false;
  let booksCache = [];

  // Elementos da interface
  const booksContainer = document.getElementById("books-container") || createElement("div", "books-container");
  const readerDiv = document.getElementById("reader") || createElement("div", "reader");
  const pagesSelect = document.getElementById("pages") || createElement("select", "pages");
  const contentDiv = document.getElementById("conteudo") || createElement("div", "conteudo");
  const timeInput = document.getElementById("timeInput") || createElement("input", "timeInput", { type: "number", min: "100", value: "1000" });
  const autoButton = document.getElementById("autoButton") || createElement("button", "autoButton", { text: "🚀 Autocompletar Tudo" });

  // Token da URL
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token || token.trim() === "") {
    booksContainer.innerHTML = "<p>⚠️ Token inválido ou ausente na URL. Use <code>?token=SEU_TOKEN</code></p>";
    showNotification("❌ Token ausente. Verifique a URL.");
    return;
  }

  // Requisição à API LeiaCheat (moonscripts.cloud/livros)
  async function apiRequest(type, extra = {}) {
    const res = await fetch("https://api.moonscripts.cloud/livros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, token, ...extra })
    });
    return await res.json();
  }

  // Proxy CORS para APIs externas como da Árvore
  async function apiCorsRequest({ url, method = "GET", headers = {}, body = null }) {
    const res = await fetch("https://api.moonscripts.cloud/cors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, method, headers, body })
    });

    const json = await res.json();
    console.log("Resposta do proxy CORS:", json);
    return json;
  }

  function createElement(tag, id = "", attrs = {}) {
    const el = document.createElement(tag);
    if (id) el.id = id;
    for (const key in attrs) {
      if (key === "text") el.textContent = attrs[key];
      else el.setAttribute(key, attrs[key]);
    }
    return el;
  }

  function showNotification(msg) {
    const n = document.createElement("div");
    n.className = "leiacheat-notification";
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000);
  }

  async function loadBooks() {
    showNotification("Carregando livros...");
    try {
      const data = await apiRequest("buscarLivros");
      const books = data?.result?.data?.searchBookV3?.books || [];
      booksContainer.innerHTML = "";
      booksCache = books;

      if (!books.length) {
        booksContainer.innerHTML = "<p>Nenhum livro encontrado.</p>";
        showNotification("⚠️ Nenhum livro encontrado.");
        return;
      }

      for (const book of books) {
        const card = document.createElement("div");
        card.className = "book-card";
        card.innerHTML = `
          <div class="book-image-container">
            <img src="${book.imageUrlThumb || 'https://via.placeholder.com/150'}" alt="Livro">
          </div>
          <div class="book-title">${book.name || 'Título desconhecido'}</div>
          <p style="color:#bbb;font-size:0.9rem">${book.author || "Autor desconhecido"}</p>
        `;

        const btn = document.createElement("button");
        btn.className = "concluir-btn";
        btn.textContent = "📖 Ler com Cheat";
        btn.onclick = () => {
          currentBookSlug = book.slug;
          loadRealPages(book.slug);
        };

        card.appendChild(btn);
        booksContainer.appendChild(card);
      }

      showNotification("✅ Livros carregados.");
    } catch (err) {
      showNotification("❌ Erro ao carregar livros.");
      console.error("Erro ao carregar livros:", err);
    }
  }

  async function loadRealPages(slug) {
    booksContainer.classList.add("hidden");
    readerDiv.classList.remove("hidden");

    try {
      const chaptersRes = await apiRequest("capitulosLivro", { book_id: slug });
      const chapters = chaptersRes?.result?.data || [];
      pages = [];

      const pagePromises = chapters.map(async (chapter) => {
        const pagesRes = await apiRequest("paginasCapitulo", { chapterId: chapter.id });
        const pagesData = pagesRes?.result?.data || [];
        return pagesData.map(page => ({
          chapterId: chapter.id,
          title: page.title || "Página",
          content: page.htmlContent || page.text || "<p>[Sem conteúdo]</p>"
        }));
      });

      pages = (await Promise.all(pagePromises)).flat();

      if (!pages.length) {
        showNotification(`❌ Nenhuma página encontrada para o livro (slug: ${slug}).`);
        readerDiv.classList.add("hidden");
        booksContainer.classList.remove("hidden");
        return;
      }

      pagesSelect.innerHTML = "";
      pages.forEach((page, i) => {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = page.title;
        pagesSelect.appendChild(option);
      });

      pagesSelect.onchange = () => openPage(parseInt(pagesSelect.value));
      timeInput.oninput = () => intervalTime = parseInt(timeInput.value) || 1000;
      autoButton.onclick = () => isRunning ? pauseAuto() : startAuto();

      openPage(0);
      if (!isAutoMode) startAuto();
    } catch (err) {
      showNotification("❌ Erro ao carregar páginas do livro.");
      console.error("Erro:", err);
      readerDiv.classList.add("hidden");
      booksContainer.classList.remove("hidden");
    }
  }

  function openPage(index) {
    if (index < 0 || index >= pages.length) return;
    currentPageIndex = index;
    pagesSelect.value = index;
    contentDiv.innerHTML = pages[index].content || "<p>[Sem conteúdo]</p>";
    contentDiv.scrollTop = 0;
    showNotification(`📖 Página ${index + 1} de ${pages.length}`);
  }

  function pauseAuto() {
    isRunning = false;
    autoButton.textContent = "🚀 Autocompletar Tudo";
  }

  async function startAuto() {
    if (isRunning) return;
    isRunning = true;
    autoButton.textContent = "⏸️ Pausar Autocompletar";

    const scroll = async () => {
      if (!isRunning) return;

      if (contentDiv.scrollTop + contentDiv.clientHeight >= contentDiv.scrollHeight - 10) {
        if (currentPageIndex + 1 < pages.length) {
          openPage(++currentPageIndex);

          await apiRequest("registrarPagina", {
            book_slug: currentBookSlug,
            chapter_id: pages[currentPageIndex].chapterId,
            page_number: currentPageIndex
          });

          if (currentPageIndex % 10 === 0)
            await apiRequest("marcarCapituloLido", {
              book_id: currentBookSlug,
              chapter_id: pages[currentPageIndex].chapterId
            });

          if (currentPageIndex % 5 === 0)
            await apiRequest("highlight", {
              chapter_id: pages[currentPageIndex].chapterId,
              content: "Trecho automático gerado"
            });

          if (currentPageIndex % 15 === 0)
            await apiRequest("bookmark", {
              chapter_id: pages[currentPageIndex].chapterId,
              page_number: currentPageIndex
            });

          setTimeout(scroll, intervalTime);
        } else {
          showNotification("✅ Leitura concluída.");
          pauseAuto();
        }
      } else {
        contentDiv.scrollBy(0, 10);
        requestAnimationFrame(scroll);
      }
    };

    scroll();
  }

  // Inicialização
  loadBooks();
})();
