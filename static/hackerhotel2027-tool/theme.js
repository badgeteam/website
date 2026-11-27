// Light/dark theme. The choice ('system', 'light' or 'dark') is stored in
// localStorage; 'system' (the default) follows the OS preference, including
// live changes. Loaded from <head> so the theme is applied before the page
// first renders, instead of flashing the wrong theme on load.
'use strict';

const THEME_STORAGE_KEY = 'theme';
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function storedThemeChoice() {
	try {
		const choice = localStorage.getItem(THEME_STORAGE_KEY);
		return choice === 'light' || choice === 'dark' ? choice : 'system';
	} catch (e) {
		return 'system';
	}
}

// Sets data-theme on <html>. Once the page has its #theme-select, it also
// syncs the select with the stored choice and names the theme that "System"
// stands for, as "System (dark)" or "System (light)".
function applyTheme() {
	const choice = storedThemeChoice();
	const systemTheme = systemDarkQuery.matches ? 'dark' : 'light';
	const theme = choice === 'system' ? systemTheme : choice;
	document.documentElement.dataset.theme = theme;

	const select = document.getElementById('theme-select');
	if (!select) return;
	select.value = choice;
	const systemOption = select.querySelector('option[value="system"]');
	if (systemOption) systemOption.textContent = `System (${systemTheme})`;
}

applyTheme();
systemDarkQuery.addEventListener('change', applyTheme);

// Another tab changed the theme: follow it. A null key means storage was cleared.
window.addEventListener('storage', (event) => {
	if (event.key === THEME_STORAGE_KEY || event.key === null) applyTheme();
});

document.addEventListener('DOMContentLoaded', () => {
	const select = document.getElementById('theme-select');
	if (!select) return;
	applyTheme();
	select.addEventListener('change', () => {
		try {
			if (select.value === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
			else localStorage.setItem(THEME_STORAGE_KEY, select.value);
		} catch (e) {
			/* storage unavailable: the choice just won't persist */
		}
		applyTheme();
	});
});
