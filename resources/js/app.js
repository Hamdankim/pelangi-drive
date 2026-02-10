import './bootstrap';

document.addEventListener('DOMContentLoaded', () => {
    const menuButtons = document.querySelectorAll('[data-menu-button]');
    const menuPanels = document.querySelectorAll('[data-menu-panel]');

    const closeAllMenus = () => {
        menuPanels.forEach((panel) => panel.classList.remove('open'));
    };

    menuButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const panel = document.getElementById(button.dataset.menuButton);
            if (!panel) {
                return;
            }
            const isOpen = panel.classList.contains('open');
            closeAllMenus();
            if (!isOpen) {
                panel.classList.add('open');
            }
        });
    });

    menuPanels.forEach((panel) => {
        panel.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    });

    document.addEventListener('click', (event) => {
        if (![...menuPanels].some((panel) => panel.contains(event.target)) &&
            ![...menuButtons].some((button) => button.contains(event.target))) {
            closeAllMenus();
        }
    });

    document.querySelectorAll('[data-href]').forEach((card) => {
        card.addEventListener('click', () => {
            window.location.href = card.dataset.href;
        });
    });

    document.querySelectorAll('.rename-toggle').forEach((button) => {
        button.addEventListener('click', () => {
            const input = document.getElementById(button.dataset.renameTarget);
            const submit = document.getElementById(button.dataset.submitTarget);
            if (input) {
                input.disabled = false;
                input.focus();
                input.select();
            }
            if (submit) {
                submit.disabled = false;
            }
        });
    });
});
