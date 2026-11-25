document.addEventListener('DOMContentLoaded', () => {
    let logradourosData = [];
    let loadStatus = 'loading'; // 'loading' | 'ready' | 'error'
    let loadErrorMessage = '';

    const searchInput = document.getElementById('searchInput');
    const autocompleteList = document.getElementById('autocompleteList');
    const resultSection = document.getElementById('resultSection');

    const resLogradouro = document.getElementById('resLogradouro');
    const resBairro = document.getElementById('resBairro');
    const resCidade = document.getElementById('resCidade');
    const resCep = document.getElementById('resCep');

    function extractRecords(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.logradouros)) return data.logradouros;
        if (data && Array.isArray(data.ceps)) return data.ceps;
        return [];
    }

    fetch('./data/ceps.json', { cache: 'no-store' })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ao buscar ./data/ceps.json`);
            }
            return response.json();
        })
        .then((data) => {
            const records = extractRecords(data);
            if (!Array.isArray(records) || records.length === 0) {
                throw new Error('O arquivo ./data/ceps.json não contém registros válidos em "logradouros".');
            }
            logradourosData = records;
            loadStatus = 'ready';
        })
        .catch((error) => {
            loadStatus = 'error';
            loadErrorMessage = error.message || 'Falha ao carregar ./data/ceps.json';
            console.error('Erro no carregamento de ./data/ceps.json:', error);
        });

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function showDropdownMessage(message) {
        autocompleteList.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'autocomplete-empty';
        div.textContent = message;
        autocompleteList.appendChild(div);
        autocompleteList.classList.remove('hidden');
    }

    function renderResult(item) {
        const tipo = item.tipo || '';
        const logradouro = item.logradouro || '';
        resLogradouro.textContent = `${tipo} ${logradouro}`.trim();
        resBairro.textContent = item.bairro || 'Não informado';
        resCidade.textContent = `${item.localidade || item.cidade || 'Ituiutaba'} - ${item.uf || 'MG'}`;
        resCep.textContent = item.cep || '-';

        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    searchInput.addEventListener('input', (event) => {
        const rawQuery = event.target.value.trim();
        const query = normalizeText(rawQuery);
        autocompleteList.innerHTML = '';

        if (query.length < 3) {
            autocompleteList.classList.add('hidden');
            return;
        }

        if (loadStatus === 'loading') {
            showDropdownMessage('Carregando base ./data/ceps.json...');
            return;
        }

        if (loadStatus === 'error') {
            showDropdownMessage(`Erro ao ler ./data/ceps.json (${loadErrorMessage}).`);
            return;
        }

        const queryDigits = query.replace(/\D/g, '');

        const filtered = logradourosData.filter((item) => {
            const fullStreet = normalizeText(`${item.tipo || ''} ${item.logradouro || ''}`);
            const streetOnly = normalizeText(item.logradouro || '');
            const district = normalizeText(item.bairro || '');
            const cepDigits = String(item.cep || '').replace(/\D/g, '');

            return (
                fullStreet.includes(query) ||
                streetOnly.includes(query) ||
                district.includes(query) ||
                (queryDigits.length >= 3 && cepDigits.includes(queryDigits))
            );
        });

        if (filtered.length === 0) {
            showDropdownMessage(`Nenhum logradouro encontrado para "${rawQuery}".`);
            return;
        }

        filtered.slice(0, 12).forEach((item) => {
            const option = document.createElement('div');
            option.className = 'autocomplete-item';
            option.setAttribute('role', 'option');
            option.setAttribute('tabindex', '0');

            const displayStreet = `${item.tipo || ''} ${item.logradouro || ''}`.trim();

            const leftSpan = document.createElement('span');
            const strong = document.createElement('strong');
            strong.textContent = displayStreet;
            leftSpan.appendChild(strong);
            leftSpan.appendChild(document.createTextNode(item.bairro ? ` — ${item.bairro}` : ''));

            const rightSpan = document.createElement('span');
            rightSpan.textContent = item.cep || '';
            rightSpan.style.fontWeight = '700';
            rightSpan.style.color = '#1d4ed8';

            option.appendChild(leftSpan);
            option.appendChild(rightSpan);

            const selectItem = () => {
                renderResult(item);
                searchInput.value = displayStreet;
                autocompleteList.classList.add('hidden');
            };

            option.addEventListener('click', selectItem);
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectItem();
                }
            });

            autocompleteList.appendChild(option);
        });

        autocompleteList.classList.remove('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.search-box-wrapper')) {
            autocompleteList.classList.add('hidden');
        }
    });

    const modalTriggers = document.querySelectorAll('.modal-trigger');
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close-btn');

    function closeAllModals() {
        modals.forEach((modal) => modal.classList.remove('open'));
    }

    modalTriggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const modalId = trigger.getAttribute('data-modal');
            const targetModal = document.getElementById(modalId);
            closeAllModals();
            if (targetModal) {
                targetModal.classList.add('open');
            }
        });
    });

    closeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const parentModal = btn.closest('.modal');
            if (parentModal) {
                parentModal.classList.remove('open');
            }
        });
    });

    modals.forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('open');
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllModals();
            autocompleteList.classList.add('hidden');
        }
    });
});