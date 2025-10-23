// Улучшенная версия основного скрипта с исправленными ошибками
class EducationSearch {
    constructor() {
        this.institutions = [];
        this.currentResults = [];
        this.isLoading = false;
        this.currentEducationType = 'all'; // 'all', 'spo', 'higher'
        this.init();
    }

    // Инициализация
    async init() {
        try {
            await this.loadDatabase();
            this.setupEventListeners();
            this.log('Система инициализирована успешно');
        } catch (error) {
            this.handleError('Ошибка инициализации', error);
        }
    }

    // Загрузка базы данных
    async loadDatabase() {
        try {
            const response = await fetch('database.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const rawInstitutions = data.institutions || [];
            
            // Валидация и фильтрация данных
            this.institutions = rawInstitutions.filter(inst => {
                if (this.validateInstitution(inst)) {
                    return true;
                } else {
                    this.log(`Исключено некорректное учебное заведение: ${inst.name || 'Неизвестно'}`, 'warning');
                    return false;
                }
            });
            
            this.log(`Загружено ${this.institutions.length} учебных заведений (отфильтровано ${rawInstitutions.length - this.institutions.length} некорректных)`);
        } catch (error) {
            this.handleError('Ошибка загрузки базы данных', error);
            // Fallback к встроенным данным
            this.loadFallbackData();
        }
    }

    // Резервные данные при ошибке загрузки
    loadFallbackData() {
        this.institutions = [
            {
                id: 1,
                name: "Лицей №1 им. Ломоносова",
                type: "Лицей",
                city: "Москва",
                profiles: ["Математика", "Физика", "IT"],
                contact: "Тел: +7 (495) 123-45-67\nул. Ломоносова, 15"
            }
        ];
        this.log('Используются резервные данные');
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.querySelector('.search-button');
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
            
            // Очистка результатов при изменении запроса
            searchInput.addEventListener('input', () => {
                this.clearResults();
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // Обработчики для быстрых фильтров
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const profile = e.target.textContent.trim();
                this.quickFilter(profile);
            });
        });
    }

    // Безопасная экранирование HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Валидация входных данных
    validateInput(query) {
        if (!query || typeof query !== 'string') {
            return false;
        }
        
        // Проверка на XSS атаки
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(query));
    }

    // Валидация данных учебного заведения
    validateInstitution(inst) {
        if (!inst || typeof inst !== 'object') {
            return false;
        }
        
        // Проверяем обязательные поля
        const requiredFields = ['id', 'name', 'type', 'city'];
        for (const field of requiredFields) {
            if (!inst[field]) {
                this.log(`Отсутствует обязательное поле: ${field}`, 'warning');
                return false;
            }
        }
        
        // Проверяем типы данных
        if (typeof inst.id !== 'number' || inst.id <= 0) {
            this.log(`Некорректный ID: ${inst.id}`, 'warning');
            return false;
        }
        
        if (typeof inst.name !== 'string' || inst.name.trim().length === 0) {
            this.log(`Некорректное название: ${inst.name}`, 'warning');
            return false;
        }
        
        return true;
    }

    // Основная функция поиска
    performSearch() {
        if (this.isLoading) {
            this.log('Поиск уже выполняется...', 'warning');
            return;
        }

        const searchInput = document.getElementById('searchInput');
        if (!searchInput) {
            this.handleError('Поле поиска не найдено');
            return;
        }

        const query = searchInput.value.trim();
        
        if (!query) {
            this.showAlert('Пожалуйста, введите запрос для поиска');
            return;
        }

        if (!this.validateInput(query)) {
            this.showAlert('Некорректный запрос. Пожалуйста, введите безопасный текст.');
            return;
        }

        this.isLoading = true;
        this.log(`Поиск: "${query}"`);
        this.log(`Всего учебных заведений в базе: ${this.institutions.length}`);

        try {
            // Фильтрация результатов с улучшенной логикой поиска
            const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
            this.log(`Слова для поиска: ${JSON.stringify(queryWords)}`);
            
            this.currentResults = this.institutions.filter(inst => {
                try {
                    // Безопасное создание строки поиска
                    const profiles = Array.isArray(inst.profiles) ? inst.profiles : [];
                    const searchText = `${inst.name || ''} ${inst.type || ''} ${inst.city || ''} ${profiles.join(' ')} ${inst.description || ''}`.toLowerCase();
                    
                    // Улучшенная логика поиска
                    if (queryWords.length === 0) return false;
                    
                    // Улучшенная логика поиска - ищем значимые слова
                    const significantWords = queryWords.filter(word => word.length > 2);
                    
                    if (significantWords.length === 0) {
                        // Если нет значимых слов, ищем все слова (кроме предлогов)
                        const meaningfulWords = queryWords.filter(word => !['в', 'на', 'по', 'для', 'от', 'до', 'с', 'из', 'к', 'у', 'о', 'об'].includes(word));
                        const hasMatch = meaningfulWords.length === 0 || meaningfulWords.every(word => searchText.includes(word));
                        if (hasMatch) {
                            this.log(`Заведение "${inst.name}" подходит по всем значимым словам`);
                        }
                        return hasMatch;
                    }
                    
                    // Проверяем, что все значимые слова присутствуют
                    const hasMatch = significantWords.every(word => {
                        // Проверяем точное совпадение
                        if (searchText.includes(word)) {
                            this.log(`Найдено точное совпадение "${word}" в "${inst.name}"`);
                            return true;
                        }
                        
                        // Проверяем частичные совпадения для ключевых слов
                        if (word.includes('мат') && searchText.includes('математик')) {
                            this.log(`Найдено частичное совпадение "${word}" -> "математик" в "${inst.name}"`);
                            return true;
                        }
                        if (word.includes('класс') && (searchText.includes('школ') || searchText.includes('лицей') || searchText.includes('гимнази') || searchText.includes('учебн'))) {
                            this.log(`Найдено совпадение "класс" -> учебное заведение в "${inst.name}"`);
                            return true;
                        }
                        if (word.includes('брянск') && searchText.includes('брянск')) {
                            this.log(`Найдено совпадение города "${word}" в "${inst.name}"`);
                            return true;
                        }
                        
                        return false;
                    });
                    
                    if (hasMatch) {
                        this.log(`✅ Заведение "${inst.name}" подходит для поиска`);
                    }
                    
                    return hasMatch;
                } catch (error) {
                    this.log(`Ошибка при фильтрации заведения ${inst.name}: ${error.message}`, 'warning');
                    return false;
                }
            });

            this.log(`Найдено ${this.currentResults.length} результатов из ${this.institutions.length} учебных заведений`);
            this.displayResults();
            this.populateCityFilter();
            this.scrollToResults();
            
            // Применяем фильтр по типу образования, если он активен
            if (this.currentEducationType !== 'all') {
                this.applyEducationTypeFilter();
            }

        } catch (error) {
            this.handleError('Ошибка при выполнении поиска', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Быстрый фильтр
    quickFilter(profile) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = profile;
            this.performSearch();
        }
    }

    // Фильтр по типу образования
    filterByEducationType(type) {
        this.currentEducationType = type;
        this.log(`Фильтр по типу образования: ${type}`);
        
        // Обновляем активное состояние навигации
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        if (type === 'all') {
            document.querySelector('a[onclick="filterByEducationType(\'all\')"]').classList.add('active');
        } else if (type === 'spo') {
            document.querySelector('a[onclick="filterByEducationType(\'spo\')"]').classList.add('active');
        } else if (type === 'higher') {
            document.querySelector('a[onclick="filterByEducationType(\'higher\')"]').classList.add('active');
        }
        
        // Если нет текущих результатов или выбрано "Все", показываем все заведения нужного типа
        if (this.currentResults.length === 0 || type === 'all') {
            this.showAllInstitutionsByType(type);
        } else {
            // Применяем фильтр к текущим результатам
            this.applyEducationTypeFilter();
        }
    }

    // Показать все учебные заведения определенного типа
    showAllInstitutionsByType(type) {
        this.log(`Показываем все учебные заведения типа: ${type}`);
        this.log(`Всего учебных заведений в базе: ${this.institutions.length}`);
        
        let filteredInstitutions = [];
        
        if (type === 'all') {
            filteredInstitutions = this.institutions;
        } else if (type === 'spo') {
            // СПО: колледжи и техникумы
            filteredInstitutions = this.institutions.filter(inst => {
                return inst.type === 'Колледж' || inst.type === 'Техникум' || 
                       (inst.name && (inst.name.toLowerCase().includes('колледж') || 
                                     inst.name.toLowerCase().includes('техникум')));
            });
        } else if (type === 'higher') {
            // Высшее: университеты, институты, академии
            filteredInstitutions = this.institutions.filter(inst => {
                const isUniversity = inst.type === 'Университет';
                const hasUniversityInName = inst.name && inst.name.toLowerCase().includes('университет');
                const hasInstituteInName = inst.name && inst.name.toLowerCase().includes('институт');
                const hasAcademyInName = inst.name && inst.name.toLowerCase().includes('академия');
                
                const result = isUniversity || hasUniversityInName || hasInstituteInName || hasAcademyInName;
                
                if (result) {
                    this.log(`✅ Найдено высшее учебное заведение: ${inst.name} (тип: ${inst.type})`);
                }
                
                return result;
            });
        }
        
        this.currentResults = filteredInstitutions;
        this.log(`Отфильтровано ${filteredInstitutions.length} учебных заведений типа: ${type}`);
        
        this.displayResultsWithHeader(type);
        this.populateCityFilter();
        this.scrollToResults();
        
        this.log(`Найдено ${filteredInstitutions.length} учебных заведений типа: ${type}`);
    }

    // Применение фильтра по типу образования
    applyEducationTypeFilter() {
        if (this.currentEducationType === 'all') {
            // Показываем все результаты
            this.displayResults();
            return;
        }

        const filteredResults = this.currentResults.filter(inst => {
            if (this.currentEducationType === 'spo') {
                // СПО: колледжи и техникумы
                return inst.type === 'Колледж' || inst.type === 'Техникум' || 
                       (inst.name && (inst.name.toLowerCase().includes('колледж') || 
                                     inst.name.toLowerCase().includes('техникум')));
            } else if (this.currentEducationType === 'higher') {
                // Высшее: университеты, институты, академии
                return inst.type === 'Университет' || 
                       (inst.name && (inst.name.toLowerCase().includes('университет') || 
                                     inst.name.toLowerCase().includes('институт') ||
                                     inst.name.toLowerCase().includes('академия')));
            }
            return true;
        });

        this.displayFilteredResults(filteredResults);
    }

    // Отображение отфильтрованных результатов
    displayFilteredResults(results) {
        const container = document.getElementById('resultsContainer');
        const noResults = document.getElementById('noResults');

        if (!container || !noResults) {
            this.handleError('Элементы результатов не найдены');
            return;
        }

        if (results.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            noResults.innerHTML = `
                <p>По выбранному типу образования ничего не найдено.</p>
                <p>Попробуйте изменить параметры поиска или выберите другой тип образования.</p>
            `;
            this.log('Результаты не найдены для выбранного типа образования');
            return;
        }

        noResults.style.display = 'none';

        try {
            container.innerHTML = results
                .map(inst => this.createResultCard(inst))
                .join('');
            
            this.log(`Найдено ${results.length} результатов для типа образования: ${this.currentEducationType}`);
        } catch (error) {
            this.handleError('Ошибка при отображении отфильтрованных результатов', error);
        }
    }

    // Отображение результатов с заголовком по типу образования
    displayResultsWithHeader(type) {
        const container = document.getElementById('resultsContainer');
        const noResults = document.getElementById('noResults');
        const resultsSection = document.getElementById('results');

        this.log(`displayResultsWithHeader вызвана для типа: ${type}`);
        this.log(`Текущих результатов: ${this.currentResults.length}`);

        if (!container || !noResults || !resultsSection) {
            this.handleError('Элементы результатов не найдены');
            return;
        }

        // Показываем секцию результатов
        resultsSection.style.display = 'block';
        this.log('Секция результатов показана');

        if (this.currentResults.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            
            let message = '';
            if (type === 'spo') {
                message = `
                    <p>К сожалению, в базе данных пока нет учебных заведений СПО.</p>
                    <p>Попробуйте поиск по другим критериям или выберите другой тип образования.</p>
                `;
            } else if (type === 'higher') {
                message = `
                    <p>К сожалению, в базе данных пока нет высших учебных заведений.</p>
                    <p>Попробуйте поиск по другим критериям или выберите другой тип образования.</p>
                `;
            } else {
                message = `
                    <p>По вашему запросу ничего не найдено.</p>
                    <p>Попробуйте изменить параметры поиска.</p>
                `;
            }
            
            noResults.innerHTML = message;
            this.log('Результаты не найдены для выбранного типа образования');
            return;
        }

        noResults.style.display = 'none';

        try {
            // Создаем заголовок
            let header = '';
            const count = this.currentResults.length;
            if (type === 'spo') {
                header = `
                    <div class="results-type-header">
                        <h2>🎓 Среднее профессиональное образование (СПО)</h2>
                        <p>Колледжи и техникумы для выпускников 9 класса</p>
                        <div class="results-count">Найдено: ${count} учебных заведений</div>
                    </div>
                `;
            } else if (type === 'higher') {
                header = `
                    <div class="results-type-header">
                        <h2>🎓 Высшее образование</h2>
                        <p>Университеты, институты и академии для выпускников 11 класса</p>
                        <div class="results-count">Найдено: ${count} учебных заведений</div>
                    </div>
                `;
            } else {
                header = `
                    <div class="results-type-header">
                        <h2>🎓 Все учебные заведения</h2>
                        <p>Полный список образовательных учреждений</p>
                        <div class="results-count">Найдено: ${count} учебных заведений</div>
                    </div>
                `;
            }

            container.innerHTML = header + this.currentResults
                .map(inst => this.createResultCard(inst))
                .join('');
            
            this.log(`Найдено ${this.currentResults.length} результатов для типа: ${type}`);
        } catch (error) {
            this.handleError('Ошибка при отображении результатов с заголовком', error);
        }
    }

    // Отображение результатов
    displayResults() {
        const container = document.getElementById('resultsContainer');
        const noResults = document.getElementById('noResults');

        if (!container || !noResults) {
            this.handleError('Элементы результатов не найдены');
            return;
        }

        if (this.currentResults.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            this.log('Результаты не найдены');
            return;
        }

        noResults.style.display = 'none';

        try {
            container.innerHTML = this.currentResults
                .map(inst => this.createResultCard(inst))
                .join('');
            
            this.log(`Найдено ${this.currentResults.length} результатов`);
        } catch (error) {
            this.handleError('Ошибка при отображении результатов', error);
        }
    }

    // Создание карточки результата
    createResultCard(inst) {
        const safeName = this.escapeHtml(inst.name || 'Название не указано');
        const safeCity = this.escapeHtml(inst.city || 'Город не указан');
        const safeType = this.escapeHtml(inst.type || 'Тип не указан');
        const safeProfiles = (inst.profiles || []).map(profile => 
            `<span class="profile-tag">${this.escapeHtml(profile)}</span>`
        ).join('');
        
        // Обработка контактной информации
        let contactHtml = '';
        if (inst.contact) {
            if (typeof inst.contact === 'string') {
                // Если контакт - строка (старый формат)
                contactHtml = this.escapeHtml(inst.contact).replace(/\n/g, '<br>');
            } else if (typeof inst.contact === 'object') {
                // Если контакт - объект (новый формат)
                const contact = inst.contact;
                contactHtml = `
                    <div class="contact-info">
                        ${contact.phone ? `<div><strong>Телефон:</strong> ${this.escapeHtml(contact.phone)}</div>` : ''}
                        ${contact.address ? `<div><strong>Адрес:</strong> ${this.escapeHtml(contact.address)}</div>` : ''}
                        ${contact.email ? `<div><strong>Email:</strong> <a href="mailto:${this.escapeHtml(contact.email)}">${this.escapeHtml(contact.email)}</a></div>` : ''}
                        ${contact.website ? `<div><strong>Сайт:</strong> <a href="${this.escapeHtml(contact.website)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(contact.website)}</a></div>` : ''}
                    </div>
                `;
            }
        }

        // Добавляем описание, если есть
        const description = inst.description ? `<div class="card-description">${this.escapeHtml(inst.description)}</div>` : '';
        
        // Добавляем рейтинг, если есть
        const rating = inst.rating ? `<div class="card-rating">⭐ ${inst.rating}/5</div>` : '';
        
        // Определяем тип образования
        let educationType = '';
        if (inst.type === 'Колледж' || inst.type === 'Техникум' || 
            (inst.name && (inst.name.toLowerCase().includes('колледж') || inst.name.toLowerCase().includes('техникум')))) {
            educationType = '<div class="education-type spo">СПО (9 класс)</div>';
        } else if (inst.type === 'Университет' ||
                   (inst.name && (inst.name.toLowerCase().includes('университет') || 
                                 inst.name.toLowerCase().includes('институт') ||
                                 inst.name.toLowerCase().includes('академия')))) {
            educationType = '<div class="education-type higher">Высшее (11 класс)</div>';
        }

        return `
            <div class="result-card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${safeName}</h3>
                        <p class="card-city">${safeCity}</p>
                    </div>
                    <div class="card-header-right">
                        <span class="card-type">${safeType}</span>
                        ${educationType}
                    </div>
                </div>
                ${description}
                <div class="card-profiles">
                    <strong>Профили обучения:</strong>
                    <div class="profile-tags">
                        ${safeProfiles}
                    </div>
                </div>
                <div class="card-contact">
                    ${contactHtml}
                </div>
                ${rating}
            </div>
        `;
    }

    // Заполнение фильтра городов
    populateCityFilter() {
        const cityFilter = document.getElementById('cityFilter');
        if (!cityFilter) return;

        try {
            const cities = [...new Set(this.currentResults
                .map(inst => inst.city)
                .filter(city => city && typeof city === 'string')
            )].sort();
            
            cityFilter.innerHTML = 
                '<option value="">Все города</option>' + 
                cities.map(city => `<option value="${this.escapeHtml(city)}">${this.escapeHtml(city)}</option>`).join('');
        } catch (error) {
            this.handleError('Ошибка при заполнении фильтра городов', error);
        }
    }

    // Применение фильтров
    applyFilters() {
        const typeFilter = document.getElementById('typeFilter');
        const cityFilter = document.getElementById('cityFilter');
        const searchInput = document.getElementById('searchInput');

        if (!searchInput) return;

        const query = searchInput.value.toLowerCase().trim();
        
        if (!query) {
            this.currentResults = this.institutions;
        } else {
            const queryWords = query.split(/\s+/).filter(word => word.length > 0);
            
            let filtered = this.institutions.filter(inst => {
                try {
                    const profiles = Array.isArray(inst.profiles) ? inst.profiles : [];
                    const searchText = `${inst.name || ''} ${inst.type || ''} ${inst.city || ''} ${profiles.join(' ')} ${inst.description || ''}`.toLowerCase();
                    
                    // Улучшенная логика поиска
                    if (queryWords.length === 0) return false;
                    
                    // Ищем значимые слова
                    const significantWords = queryWords.filter(word => word.length > 2);
                    
                    if (significantWords.length === 0) {
                        // Если нет значимых слов, ищем все слова (кроме предлогов)
                        const meaningfulWords = queryWords.filter(word => !['в', 'на', 'по', 'для', 'от', 'до', 'с', 'из', 'к', 'у', 'о', 'об'].includes(word));
                        return meaningfulWords.length === 0 || meaningfulWords.every(word => searchText.includes(word));
                    }
                    
                    // Проверяем, что все значимые слова присутствуют
                    const hasMatch = significantWords.every(word => {
                        // Проверяем точное совпадение
                        if (searchText.includes(word)) return true;
                        
                        // Проверяем частичные совпадения для ключевых слов
                        if (word.includes('мат') && searchText.includes('математик')) return true;
                        if (word.includes('класс') && (searchText.includes('школ') || searchText.includes('лицей') || searchText.includes('гимнази') || searchText.includes('учебн'))) return true;
                        if (word.includes('брянск') && searchText.includes('брянск')) return true;
                        
                        return false;
                    });
                    
                    return hasMatch;
                } catch (error) {
                    this.log(`Ошибка при фильтрации заведения ${inst.name}: ${error.message}`, 'warning');
                    return false;
                }
            });

            if (typeFilter && typeFilter.value) {
                filtered = filtered.filter(inst => inst.type === typeFilter.value);
            }

            if (cityFilter && cityFilter.value) {
                filtered = filtered.filter(inst => inst.city === cityFilter.value);
            }

            this.currentResults = filtered;
        }
        
        this.displayResults();
    }

    // Прокрутка к результатам
    scrollToResults() {
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            this.log('Прокручиваем к результатам');
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            this.log('Секция результатов не найдена для прокрутки');
        }
    }

    // Очистка результатов
    clearResults() {
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        this.currentResults = [];
    }

    // Показ уведомлений
    showAlert(message, type = 'info') {
        // Создаем уведомление
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            border-radius: 8px;
            z-index: 1000;
            max-width: 300px;
        `;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 3000);
    }

    // Обработка ошибок
    handleError(message, error = null) {
        console.error(message, error);
        this.showAlert(message, 'error');
        this.log(`Ошибка: ${message}`, 'error');
    }

    // Логирование
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
        
        // Можно добавить отправку логов на сервер
        if (level === 'error') {
            // Отправка ошибок на сервер для мониторинга
            this.sendErrorToServer(message);
        }
    }

    // Отправка ошибок на сервер (заглушка)
    sendErrorToServer(error) {
        // В реальном приложении здесь будет отправка на сервер
        console.log('Отправка ошибки на сервер:', error);
    }
}

// Глобальные функции для совместимости
let searchSystem;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    searchSystem = new EducationSearch();
});

// Глобальные функции для обратной совместимости
function performSearch() {
    if (searchSystem) {
        searchSystem.performSearch();
    }
}

function quickFilter(profile) {
    if (searchSystem) {
        searchSystem.quickFilter(profile);
    }
}

function applyFilters() {
    if (searchSystem) {
        searchSystem.applyFilters();
    }
}

function filterByEducationType(type) {
    if (searchSystem) {
        searchSystem.filterByEducationType(type);
    }
}
