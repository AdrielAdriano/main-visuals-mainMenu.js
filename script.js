(function () {
  'use strict';

  // State variables
  let isRunning = false;
  let intervalTime = 1000;
  let currentPageIndex = 0;
  let pages = [];
  let currentBookSlug = null;
  let isAutoMode = false;
  let booksCache = [];

  // DOM elements with fallback
  const booksContainer = document.getElementById("books-container") || document.createElement("div");
  const readerDiv = document.getElementById("reader") || document.createElement("div");
  const pagesSelect = document.getElementById("pages") || document.createElement("select");
  const contentDiv = document.getElementById("conteudo") || document.createElement("div");
  const timeInput = document.getElementById("timeInput") || document.createElement("input");
  const autoButton = document.getElementById("autoButton") || document.createElement("button");

  // Extract token from URL
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token || token.trim() === "") {
    booksContainer.innerHTML = "<p>⚠️ Token não encontrado ou inválido na URL. Acesse com <code>?token=SEU_TOKEN</code></p>";
    showNotification("❌ Token inválido. Verifique a URL.");
    return;
  }

  // Fetch with retry logic, enhanced to handle non-JSON responses
  async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const contentType = response.headers.get("Content-Type") || "unknown";
          const errorText = await response.text();
          console.error(`Fetch failed for ${url}: Status ${response.status} ${response.statusText}, Content-Type: ${contentType}`, errorText.slice(0, 200));
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        const contentType = response.headers.get("Content-Type") || "";
        if (!contentType.includes("application/json")) {
          const errorText = await response.text();
          console.error(`Non-JSON response for ${url}: Content-Type: ${contentType}`, errorText.slice(0, 200));
          throw new Error(`Expected JSON, received ${contentType}`);
        }
        return response;
      } catch (error) {
        if (i < retries - 1) {
          console.warn(`Retrying fetch (${i + 1}/${retries}) for ${url}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        } else {
          throw new Error(`Failed after ${retries} retries for ${url}: ${error.message}`);
        }
      }
    }
  }

  // Show notification
  function showNotification(msg) {
    const n = document.createElement("div");
    n.className = "leiacheat-notification";
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000); // Extended to 5s for visibility
  }

  // Load books from API
  async function loadBooks() {
    showNotification("Carregando livros...");
    try {
      const res = await fetch("https://livros.arvore.com.br/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          operationName: "searchBookV3",
          variables: { searchTerm: null, page: 1, opts: "{}", perPage: 50 },
          query: `query searchBookV3($searchTerm: String, $page: Int, $perPage: Int!, $opts: String) {
            searchBookV3(searchTerm: $searchTerm, page: $page, perPage: $perPage, opts: $opts) {
              books { name slug author imageUrlThumb }
            }
          }`
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      const books = data?.data?.searchBookV3?.books || [];
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
          console.log(`Loading book with slug: ${book.slug}`);
          detalhesDoLivro(currentBookSlug);
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

  // Load book details
  async function detalhesDoLivro(bookSlug) {
    try {
      const res = await fetchWithRetry(`https://livros.arvore.com.br/leitor/api_mobile/book/${bookSlug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log("📚 Detalhes do livro:", data);
    } catch (e) {
      showNotification("⚠️ Erro ao buscar detalhes do livro.");
      console.error(`Erro ao buscar detalhes do livro (slug: ${bookSlug}):`, e);
    }
  }

  // Load pages for a book
  async function loadRealPages(slug) {
    booksContainer.classList.add("hidden");
    readerDiv.classList.remove("hidden");

    try {
      console.log(`Fetching chapters for slug: ${slug}`);
      const resChapters = await fetchWithRetry(`https://e-reader.arvore.com.br/api/books/{book_id}/chapters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const chaptersData = await resChapters.json();
      console.log("Chapters data:", chaptersData);
      pages = [];

      const pagePromises = (chaptersData.data || []).map(async (chapter) => {
        console.log(`Fetching pages for chapter ID: ${chapter.id}`);
        const resPages = await fetchWithRetry(`https://e-reader.arvore.com.br/api/chapters/${chapter.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const pagesData = await resPages.json();
        console.log(`Pages data for chapter ${chapter.id}:`, pagesData);
        return (pagesData.data || []).map(page => ({
          chapterId: chapter.id,
          title: page.title || "Página",
          content: page.htmlContent || page.text || "<p>[Sem conteúdo real]</p>"
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
      timeInput.oninput = () => {
        intervalTime = parseInt(timeInput.value) || 1000;
      };
      autoButton.onclick = () => {
        if (isRunning) {
          isRunning = false;
          autoButton.textContent = "🚀 Autocompletar Tudo";
        } else {
          startInterval();
        }
      };

      openPage(0);
      if (!isAutoMode) startInterval();
    } catch (error) {
      if (error.message.includes("HTTP error: 404")) {
        showNotification(`❌ Livro não encontrado ou sem capítulos (slug: ${slug}). Verifique o slug ou endpoint.`);
      } else {
        showNotification(`❌ Erro ao carregar páginas do livro (slug: ${slug}).`);
      }
      console.error(`Erro ao carregar páginas (slug: ${slug}):`, error);
      readerDiv.classList.add("hidden");
      booksContainer.classList.remove("hidden");
    }
  }

  // Open a specific page
  function openPage(index) {
    if (index < 0 || index >= pages.length) return;
    currentPageIndex = index;
    pagesSelect.value = index;
    contentDiv.innerHTML = pages[index].content || "<p>[Sem conteúdo]</p>";
    contentDiv.scrollTop = 0;
    showNotification(`📖 Página ${index + 1} de ${pages.length}`);
  }

  // Start auto-scrolling interval
  async function startInterval() {
    if (isRunning) return;
    isRunning = true;
    autoButton.textContent = "⏸️ Pausar Autocompletar";

    const scroll = async () => {
      if (!isRunning) return;

      if (contentDiv.scrollTop + contentDiv.clientHeight >= contentDiv.scrollHeight - 10) {
        if (currentPageIndex + 1 < pages.length) {
          openPage(++currentPageIndex);

          await registrarPaginaLida(currentBookSlug, pages[currentPageIndex].chapterId, currentPageIndex);
          if (currentPageIndex % 10 === 0) await marcarComoLido(currentBookSlug, pages[currentPageIndex].chapterId);
          if (currentPageIndex % 5 === 0) await adicionarHighlight(pages[currentPageIndex].chapterId, "Trecho automático gerado");
          if (currentPageIndex % 15 === 0) await adicionarBookmark(pages[currentPageIndex].chapterId, currentPageIndex);

          setTimeout(scroll, intervalTime);
        } else {
          showNotification("✅ Leitura concluída.");
          isRunning = false;
          autoButton.textContent = "🚀 Autocompletar Tudo";
          if (isAutoMode) autoCompleteNextBook();
        }
      } else {
        contentDiv.scrollBy(0, 10);
        requestAnimationFrame(scroll);
      }
    };

    scroll();
  }

  // Auto-complete all books
  async function autoCompleteAll(selectedBookSlug = null) {
    showNotification("🚀 Iniciando autocompletar...");
    isRunning = true;
    autoButton.textContent = "⏸️ Pausar Autocompletar";

    try {
      if (selectedBookSlug) {
        const book = booksCache.find(b => b.slug === selectedBookSlug);
        if (!book) {
          showNotification("❌ Livro não encontrado.");
          isRunning = false;
          autoButton.textContent = "🚀 Autocompletar Tudo";
          return;
        }
        currentBookSlug = book.slug;
        await detalhesDoLivro(currentBookSlug);
        await loadRealPages(book.slug);
        await new Promise(resolve => setTimeout(resolve, pages.length * intervalTime));
        showNotification(`✅ Livro "${book.name}" autocompletado!`);
      } else {
        for (const book of booksCache) {
          if (!isRunning) break;
          currentBookSlug = book.slug;
          await detalhesDoLivro(currentBookSlug);
          await loadRealPages(book.slug);
          await new Promise(resolve => setTimeout(resolve, pages.length * intervalTime));
        }
        if (isRunning) showNotification("✅ Todos os livros autocompletados!");
      }
    } catch (error) {
      showNotification("❌ Erro durante o autocompletar.");
      console.error("Erro ao autocompletar:", error);
    }

    isRunning = false;
    autoButton.textContent = "🚀 Autocompletar Tudo";
  }

  // Mark page as read
  async function registrarPaginaLida(bookSlug, chapterId, pageIndex) {
    try {
      const res = await fetchWithRetry("https://livros.arvore.com.br/leitor/api_mobile/register_pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          book_slug: bookSlug,
          chapter_id: chapterId,
          page_number: pageIndex
        })
      });
      const data = await res.json();
      console.log(`📘 Página ${pageIndex + 1} registrada como lida:`, data);
    } catch (e) {
      console.error(`❌ Erro ao registrar página lida (chapter: ${chapterId}, page: ${pageIndex}):`, e);
    }
  }

  // Mark chapter as read
  async function marcarComoLido(bookSlug, chapterId) {
    try {
      const res = await fetchWithRetry("https://livros.arvore.com.br/analytics/v1/event", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: "chapter_read",
          book_id: bookSlug,
          chapter_id: chapterId,
          source: "reader",
          time: 10000
        })
      });
      const data = await res.json();
      console.log(`✅ Capítulo ${chapterId} marcado como lido:`, data);
    } catch (err) {
      console.error(`❌ Erro ao marcar capítulo como lido (chapter: ${chapterId}):`, err);
    }
  }

  // Add highlight
  async function adicionarHighlight(chapterId, texto, cor = "#FFFF00") {
    try {
      const res = await fetchWithRetry("https://livros.arvore.com.br/leitor/api_mobile/highlights/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chapter_id: chapterId,
          content: texto,
          color: cor
        })
      });
      const data = await res.json();
      console.log("✨ Highlight adicionado com sucesso:", data);
    } catch (err) {
      console.error(`❌ Erro ao criar highlight (chapter: ${chapterId}):`, err);
    }
  }

  // Add bookmark
  async function adicionarBookmark(chapterId, pageIndex) {
    try {
      const res = await fetchWithRetry("https://livros.arvore.com.br/leitor/api_mobile/bookmarks/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chapter_id: chapterId,
          page_number: pageIndex
        })
      });
      const data = await res.json();
      console.log("🔖 Marcador adicionado:", data);
    } catch (e) {
      console.error(`❌ Erro ao adicionar marcador (chapter: ${chapterId}, page: ${pageIndex}):`, e);
    }Q
  }

  // Auto-complete next book (stub for autoMode)
  function autoCompleteNextBook() {
    console.log("Auto-completar próximo livro não implementado.");
  }

  // Initialize
  loadBooks();
})();
