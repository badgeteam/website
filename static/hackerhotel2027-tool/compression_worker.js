// Runs compressPattern() (compression.js) off the page: it can take seconds.
// Message in: {id, pattern: {fps, frames}, quantBits}; out: {id, bytes} or
// {id, error}.
'use strict';
importScripts('layout_data.js', 'compression.js');

onmessage = (ev) => {
	const { id, pattern, quantBits } = ev.data;
	try {
		const bytes = compressPattern(pattern, { quantBits });
		postMessage({ id, bytes }, [bytes.buffer]);
	} catch (e) {
		postMessage({ id, error: e.message });
	}
};
