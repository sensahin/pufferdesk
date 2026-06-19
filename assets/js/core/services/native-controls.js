(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.services = window.PufferDesk.services || {};

	function normalizeClassName(value) {
		return typeof value === 'string' ? value.trim() : '';
	}

	function addClasses(element, classes) {
		String(classes || '').split(/\s+/).filter(Boolean).forEach((className) => {
			element.classList.add(className);
		});
	}

	function createButton(label, options = {}) {
		const button = document.createElement('button');
		const variant = normalizeClassName(options.variant || 'secondary');

		button.type = options.type || 'button';
		button.className = 'pdk-control-button';
		if (variant && variant !== 'secondary') {
			button.classList.add(`pdk-control-button-${variant}`);
		}
		addClasses(button, options.className);
		button.textContent = typeof label === 'string' ? label : String(label || '');
		if (options.disabled === true) {
			button.disabled = true;
		}
		if (options.ariaLabel) {
			button.setAttribute('aria-label', options.ariaLabel);
		}

		return button;
	}

	function createForm(options = {}) {
		const form = document.createElement('form');

		form.className = 'pdk-form';
		addClasses(form, options.className);

		return form;
	}

	function createField(label, control, options = {}) {
		const field = document.createElement('label');
		const text = document.createElement('span');

		field.className = 'pdk-form-field';
		text.className = 'pdk-form-label';
		text.textContent = typeof label === 'string' ? label : String(label || '');
		addClasses(field, options.className);
		field.append(text, control);
		if (options.description) {
			const description = document.createElement('span');

			description.className = 'pdk-form-help';
			description.textContent = String(options.description);
			field.appendChild(description);
		}

		return field;
	}

	function applyControlOptions(control, options = {}) {
		control.classList.add('pdk-form-control');
		addClasses(control, options.className);
		if (options.name) {
			control.name = options.name;
		}
		if (options.placeholder) {
			control.placeholder = options.placeholder;
		}
		if (options.required === true) {
			control.required = true;
		}
		if (options.disabled === true) {
			control.disabled = true;
		}
		if (options.ariaLabel) {
			control.setAttribute('aria-label', options.ariaLabel);
		}

		return control;
	}

	function createTextInput(value = '', options = {}) {
		const input = document.createElement('input');

		input.type = options.type || 'text';
		input.value = value || '';

		return applyControlOptions(input, options);
	}

	function createTextarea(value = '', options = {}) {
		const textarea = document.createElement('textarea');

		textarea.value = value || '';
		if (Number.isFinite(options.rows)) {
			textarea.rows = options.rows;
		}

		return applyControlOptions(textarea, options);
	}

	function createSelect(value = '', options = [], controlOptions = {}) {
		const select = document.createElement('select');

		select.classList.add('pdk-form-select');
		(Array.isArray(options) ? options : []).forEach((item) => {
			const option = document.createElement('option');

			option.value = item && item.value !== undefined ? String(item.value) : '';
			option.textContent = item && item.label ? String(item.label) : option.value;
			select.appendChild(option);
		});
		select.value = value || (select.options[0] ? select.options[0].value : '');

		return applyControlOptions(select, controlOptions);
	}

	function createCheckbox(label, checked = false, options = {}) {
		const wrap = document.createElement('label');
		const input = document.createElement('input');
		const text = document.createElement('span');

		wrap.className = 'pdk-form-checkbox';
		addClasses(wrap, options.className);
		input.type = 'checkbox';
		input.checked = Boolean(checked);
		text.textContent = typeof label === 'string' ? label : String(label || '');
		wrap.append(input, text);

		return { input, wrap };
	}

	window.PufferDesk.services.nativeControls = {
		createButton,
		createCheckbox,
		createField,
		createForm,
		createSelect,
		createTextInput,
		createTextarea
	};
})();
