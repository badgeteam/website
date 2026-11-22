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

function applyTheme() {
	const choice = storedThemeChoice();
	const theme = choice === 'system' ? (systemDarkQuery.matches ? 'dark' : 'light') : choice;
	document.documentElement.dataset.theme = theme;
}

applyTheme();
systemDarkQuery.addEventListener('change', applyTheme);

document.addEventListener('DOMContentLoaded', () => {
	const select = document.getElementById('theme-select');
	select.value = storedThemeChoice();
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
