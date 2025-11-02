       const API_CONFIG = {
            apiKey: 'd2c7fa2ba929442f8c5ecfd4d58bc1cf',
            baseURL: 'https://api.spoonacular.com/recipes',
            translateURL: 'https://api.mymemory.translated.net/get'
        };

        const ingredientTranslations = {
            'leite condensado': 'condensed milk',
            'coco': 'coconut',
            'leite': 'milk',
            'açúcar': 'sugar',
            'farinha': 'flour',
            'ovos': 'eggs',
            'ovo': 'egg',
            'manteiga': 'butter',
            'chocolate': 'chocolate',
            'queijo': 'cheese',
            'presunto': 'ham',
            'tomate': 'tomato',
            'cebola': 'onion',
            'alho': 'garlic',
            'arroz': 'rice',
            'feijão': 'beans',
            'frango': 'chicken',
            'carne': 'beef',
            'peixe': 'fish',
            'batata': 'potato',
            'cenoura': 'carrot',
            'banana': 'banana',
            'maçã': 'apple',
            'morango': 'strawberry',
            'limão': 'lemon',
            'laranja': 'orange',
            'sal': 'salt',
            'pimenta': 'pepper',
            'óleo': 'oil',
            'azeite': 'olive oil',
            'macarrão': 'pasta',
            'massa': 'pasta',
            'pão': 'bread',
            'mel': 'honey',
            'canela': 'cinnamon',
            'baunilha': 'vanilla'
        };

        const input = document.getElementById('ingredientInput');
        const searchBtn = document.getElementById('searchBtn');
        const recipeGrid = document.getElementById('recipeGrid');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const noResults = document.getElementById('noResults');
        const modal = document.getElementById('recipeModal');

        let currentRecipeData = {};

        // Traduzir texto usando MyMemory API
        async function translateText(text, fromLang = 'en', toLang = 'pt-BR') {
            try {
                // Dividir texto em chunks menores (MyMemory tem limite de 500 caracteres)
                const chunkSize = 450;
                const chunks = [];
                
                if (text.length <= chunkSize) {
                    chunks.push(text);
                } else {
                    // Dividir por sentenças para manter contexto
                    const sentences = text.split(/(?<=[.!?])\s+/);
                    let currentChunk = '';
                    
                    for (const sentence of sentences) {
                        if ((currentChunk + sentence).length <= chunkSize) {
                            currentChunk += sentence + ' ';
                        } else {
                            if (currentChunk) chunks.push(currentChunk.trim());
                            currentChunk = sentence + ' ';
                        }
                    }
                    if (currentChunk) chunks.push(currentChunk.trim());
                }

                const translatedChunks = [];
                
                for (const chunk of chunks) {
                    const url = `${API_CONFIG.translateURL}?q=${encodeURIComponent(chunk)}&langpair=${fromLang}|${toLang}`;
                    
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.responseData && data.responseData.translatedText) {
                        translatedChunks.push(data.responseData.translatedText);
                    } else {
                        translatedChunks.push(chunk);
                    }
                    
                    // Pequeno delay entre requisições
                    if (chunks.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }
                
                return translatedChunks.join(' ');
            } catch (error) {
                console.error('Erro na tradução:', error);
                throw error;
            }
        }

        // Traduzir seção específica automaticamente
        async function translateAndDisplay(text, targetElement, isIngredients = false) {
            try {
                if (!text || text.trim() === '') {
                    targetElement.innerHTML = '<p class="text-gray-500">Conteúdo não disponível</p>';
                    return;
                }

                const translatedText = await translateText(text, 'en', 'pt-BR');
                
                // Formatar a tradução
                let formattedTranslation = translatedText;
                
                if (isIngredients) {
                    // Para ingredientes, colocar cada linha com bullet
                    const lines = translatedText.split('\n').filter(line => line.trim());
                    formattedTranslation = '<ul class="space-y-2">' + lines.map(line => 
                        `<li class="flex items-start">
                            <span class="text-green-600 mr-2 font-bold">•</span>
                            <span>${line.trim()}</span>
                        </li>`
                    ).join('') + '</ul>';
                } else {
                    // Para instruções, formatar parágrafos
                    formattedTranslation = translatedText
                        .split(/\.\s+/)
                        .filter(s => s.trim())
                        .map((sentence, index) => 
                            `<p class="mb-3"><strong>${index + 1}.</strong> ${sentence.trim()}${sentence.endsWith('.') ? '' : '.'}</p>`
                        ).join('');
                }
                
                targetElement.innerHTML = formattedTranslation;
            } catch (error) {
                console.error('Erro ao traduzir:', error);
                targetElement.innerHTML = `
                    <div class="text-amber-600 bg-amber-50 p-3 rounded-lg">
                        <p class="font-semibold mb-1">⚠️ Tradução indisponível</p>
                        <p class="text-sm">Mostrando conteúdo original em inglês:</p>
                    </div>
                    <div class="mt-3 text-gray-700">${text.replace(/\n/g, '<br>')}</div>
                `;
            }
        }

        function translateIngredients(text) {
            let translated = text.toLowerCase();
            for (const [pt, en] of Object.entries(ingredientTranslations)) {
                translated = translated.replace(new RegExp(pt, 'gi'), en);
            }
            return translated;
        }

        async function searchRecipes() {
            const ingredients = input.value.trim();
            
            if (!ingredients) {
                alert('Por favor, digite pelo menos um ingrediente!');
                return;
            }
            
            loadingState.classList.remove('hidden');
            emptyState.classList.add('hidden');
            noResults.classList.add('hidden');
            recipeGrid.innerHTML = '';
            
            try {
                const translatedIngredients = translateIngredients(ingredients);
                
                const response = await fetch(
                    `${API_CONFIG.baseURL}/complexSearch?apiKey=${API_CONFIG.apiKey}&includeIngredients=${encodeURIComponent(translatedIngredients)}&number=12&addRecipeInformation=true&fillIngredients=true&sort=min-missing-ingredients`
                );
                
                const data = await response.json();
                
                loadingState.classList.add('hidden');
                
                if (data.results && data.results.length > 0) {
                    displayRecipes(data.results);
                } else {
                    noResults.classList.remove('hidden');
                }
            } catch (error) {
                loadingState.classList.add('hidden');
                alert('Erro ao buscar receitas. Tente novamente!');
                console.error('Erro:', error);
            }
        }

        function displayRecipes(recipes) {
            recipeGrid.innerHTML = '';
            
            recipes.forEach(recipe => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-xl overflow-hidden shadow-lg cursor-pointer card-hover border-2 border-green-100';
                card.onclick = () => showRecipeDetails(recipe.id);
                
                const imageUrl = recipe.image || 'https://via.placeholder.com/300x200?text=Sem+Imagem';
                
                card.innerHTML = `
                    <img src="${imageUrl}" alt="${recipe.title}" class="w-full h-48 object-cover">
                    <div class="p-5">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">${recipe.title}</h3>
                        ${recipe.readyInMinutes ? `<p class="text-sm text-gray-500 mb-2">⏱️ ${recipe.readyInMinutes} minutos</p>` : ''}
                        ${recipe.usedIngredientCount ? `<p class="text-sm text-green-600 mb-2">✅ ${recipe.usedIngredientCount} ingredientes que você tem</p>` : ''}
                        <button class="text-green-600 hover:text-green-700 font-medium text-sm">
                            Ver receita completa →
                        </button>
                    </div>
                `;
                
                recipeGrid.appendChild(card);
            });
        }

        async function showRecipeDetails(recipeId) {
            try {
                const response = await fetch(
                    `${API_CONFIG.baseURL}/${recipeId}/information?apiKey=${API_CONFIG.apiKey}`
                );
                
                const recipe = await response.json();
                
                document.getElementById('modalTitle').textContent = recipe.title;
                document.getElementById('modalImage').src = recipe.image || 'https://via.placeholder.com/600x400?text=Sem+Imagem';
                
                if (recipe.readyInMinutes) {
                    document.getElementById('modalTime').textContent = `⏱️ ${recipe.readyInMinutes} minutos`;
                } else {
                    document.getElementById('modalTime').textContent = '';
                }
                
                if (recipe.servings) {
                    document.getElementById('modalServings').textContent = `🍽️ ${recipe.servings} porções`;
                } else {
                    document.getElementById('modalServings').textContent = '';
                }
                
                // Abrir o modal primeiro
                modal.classList.remove('hidden');
                
                // Preparar texto dos ingredientes
                const ingredientsDiv = document.getElementById('modalIngredients');
                let ingredientsText = '';
                
                if (recipe.extendedIngredients && recipe.extendedIngredients.length > 0) {
                    recipe.extendedIngredients.forEach(ingredient => {
                        ingredientsText += ingredient.original + '\n';
                    });
                } else {
                    ingredientsDiv.innerHTML = '<p class="text-gray-500">Ingredientes não disponíveis</p>';
                }
                
                // Preparar texto das instruções
                const instructionsDiv = document.getElementById('modalInstructions');
                let instructionsText = '';
                
                if (recipe.instructions) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = recipe.instructions;
                    instructionsText = tempDiv.textContent || tempDiv.innerText || '';
                } else if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
                    recipe.analyzedInstructions[0].steps.forEach((step, index) => {
                        instructionsText += `${step.step} `;
                    });
                }
                
                if (!instructionsText.trim()) {
                    instructionsDiv.innerHTML = '<p class="text-gray-500">Instruções não disponíveis. Visite o site da receita para mais detalhes.</p>';
                }
                
                // Traduzir ingredientes e instruções automaticamente em paralelo
                if (ingredientsText.trim()) {
                    translateAndDisplay(ingredientsText, ingredientsDiv, true);
                }
                
                if (instructionsText.trim()) {
                    translateAndDisplay(instructionsText, instructionsDiv, false);
                }
                
            } catch (error) {
                alert('Erro ao carregar detalhes da receita!');
                console.error('Erro:', error);
            }
        }

        function closeModal() {
            modal.classList.add('hidden');
        }

        searchBtn.addEventListener('click', searchRecipes);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchRecipes();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
   