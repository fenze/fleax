export type VNode = {
	type: string | symbol | ((props: unknown) => unknown);
	props: Record<string, unknown>;
	key?: string | number;
};

export const jsx = (
	type: VNode["type"],
	props: VNode["props"],
	key?: VNode["key"],
): VNode => ({
	type,
	props,
	key,
});

export const jsxs = jsx;

export const Fragment: unique symbol = Symbol.for(
	"@fleax/core.Fragment",
) as typeof Fragment;

declare global {
	namespace JSX {
		type Element = VNode;
		type MetaName =
			| "color-scheme"
			| "referrer"
			| "robots"
			| "theme-color"
			| "viewport"
			| (string & {});
		type MetaHttpEquiv =
			| "content-type"
			| "content-security-policy"
			| "default-style"
			| "refresh"
			| (string & {});
		type ScriptType =
			| "module"
			| "importmap"
			| "speculationrules"
			| (string & {});
		type InputType =
			| "button"
			| "checkbox"
			| "color"
			| "date"
			| "datetime-local"
			| "email"
			| "file"
			| "hidden"
			| "image"
			| "month"
			| "number"
			| "password"
			| "radio"
			| "range"
			| "reset"
			| "search"
			| "submit"
			| "tel"
			| "text"
			| "time"
			| "url"
			| "week";
		interface IntrinsicAttributes {
			children?: unknown;
		}
		interface HTMLAttributes extends IntrinsicAttributes {
			class?: string;
			style?: string | object;
			id?: string;
			title?: string;
			lang?: string;
			dir?: "ltr" | "rtl" | "auto";
			hidden?: boolean;
			tabindex?: number;
			role?: string;
			accesskey?: string;
			anchor?: string;
			autocapitalize?: string;
			autocorrect?: "on" | "off" | string;
			autofocus?: boolean;
			contenteditable?: boolean | "true" | "false" | "plaintext-only";
			draggable?: boolean | "true" | "false";
			enterkeyhint?: string;
			exportparts?: string;
			inputmode?: string;
			inert?: boolean;
			is?: string;
			itemid?: string;
			itemprop?: string;
			itemref?: string;
			itemscope?: boolean;
			itemtype?: string;
			nonce?: string;
			part?: string;
			popover?: "auto" | "manual" | string;
			slot?: string;
			spellcheck?: boolean | "true" | "false";
			translate?: "yes" | "no";
			virtualkeyboardpolicy?: "auto" | "manual" | string;
			writingsuggestions?: boolean | "true" | "false";
			onclick?: string | ((e: MouseEvent) => void);
			onchange?: string | ((e: Event) => void);
			oninput?: string | ((e: Event) => void);
			onsubmit?: string | ((e: Event) => void);
			onkeydown?: string | ((e: KeyboardEvent) => void);
			onkeyup?: string | ((e: KeyboardEvent) => void);
			onfocus?: string | ((e: FocusEvent) => void);
			onblur?: string | ((e: FocusEvent) => void);
			"data-*"?: string;
			[key: `on${string}`]: string | ((e: any) => void) | undefined;
			[key: `data-${string}`]: string | number | boolean | undefined;
			[key: `aria-${string}`]: string | number | boolean | undefined;
		}
		interface IntrinsicElements {
			// Document metadata
			html: HTMLAttributes & { lang?: string };
			head: HTMLAttributes;
			base: HTMLAttributes & { href?: string; target?: string };
			link: HTMLAttributes & {
				rel?: string;
				href?: string;
				type?: string;
				as?: string;
				crossorigin?: "anonymous" | "use-credentials" | "";
				fetchpriority?: "high" | "low" | "auto";
				hreflang?: string;
				integrity?: string;
				media?: string;
				referrerpolicy?: string;
				sizes?: string;
			};
			meta: HTMLAttributes & {
				name?: MetaName;
				content?: string;
				charset?: string;
				"http-equiv"?: MetaHttpEquiv;
			};
			style: HTMLAttributes & { type?: string; media?: string };
			title: HTMLAttributes;
			script: HTMLAttributes & {
				src?: string;
				type?: ScriptType;
				async?: boolean;
				crossorigin?: "anonymous" | "use-credentials" | "";
				defer?: boolean;
				fetchpriority?: "high" | "low" | "auto";
				integrity?: string;
				language?: string;
				referrerpolicy?: string;
			};
			noscript: HTMLAttributes;
			template: HTMLAttributes;
			slot: HTMLAttributes & { name?: string };

			// Sectioning/content
			body: HTMLAttributes & { background?: string; bgcolor?: string };
			address: HTMLAttributes;
			article: HTMLAttributes;
			aside: HTMLAttributes;
			footer: HTMLAttributes;
			header: HTMLAttributes;
			h1: HTMLAttributes;
			h2: HTMLAttributes;
			h3: HTMLAttributes;
			h4: HTMLAttributes;
			h5: HTMLAttributes;
			h6: HTMLAttributes;
			hgroup: HTMLAttributes;
			main: HTMLAttributes;
			nav: HTMLAttributes;
			search: HTMLAttributes;
			section: HTMLAttributes;

			// Text content
			blockquote: HTMLAttributes & { cite?: string };
			dd: HTMLAttributes;
			div: HTMLAttributes;
			dl: HTMLAttributes;
			dt: HTMLAttributes;
			figcaption: HTMLAttributes;
			figure: HTMLAttributes;
			hr: HTMLAttributes & { color?: string };
			li: HTMLAttributes;
			menu: HTMLAttributes;
			ol: HTMLAttributes & {
				reversed?: boolean;
				start?: number;
				type?: string;
			};
			p: HTMLAttributes;
			pre: HTMLAttributes;
			ul: HTMLAttributes;

			// Inline text semantics
			abbr: HTMLAttributes;
			a: HTMLAttributes & {
				href?: string;
				target?: string;
				download?: boolean | string;
				hreflang?: string;
				ping?: string;
				referrerpolicy?: string;
				rel?: string;
			};
			b: HTMLAttributes;
			bdi: HTMLAttributes;
			bdo: HTMLAttributes;
			br: HTMLAttributes;
			cite: HTMLAttributes;
			code: HTMLAttributes;
			data: HTMLAttributes & { value?: string | number };
			dfn: HTMLAttributes;
			em: HTMLAttributes;
			i: HTMLAttributes;
			kbd: HTMLAttributes;
			mark: HTMLAttributes;
			q: HTMLAttributes & { cite?: string };
			rp: HTMLAttributes;
			rt: HTMLAttributes;
			ruby: HTMLAttributes;
			s: HTMLAttributes;
			samp: HTMLAttributes;
			small: HTMLAttributes;
			span: HTMLAttributes;
			strong: HTMLAttributes;
			sub: HTMLAttributes;
			sup: HTMLAttributes;
			time: HTMLAttributes & { datetime?: string };
			u: HTMLAttributes;
			var: HTMLAttributes;
			wbr: HTMLAttributes;

			// Media & embedded content
			area: HTMLAttributes & {
				alt?: string;
				coords?: string;
				href?: string;
				shape?: string;
				target?: string;
				download?: boolean | string;
				ping?: string;
				referrerpolicy?: string;
			};
			audio: HTMLAttributes & {
				src?: string;
				controls?: boolean;
				autoplay?: boolean;
				loop?: boolean;
				muted?: boolean;
				crossorigin?: "anonymous" | "use-credentials" | "";
				preload?: "none" | "metadata" | "auto";
			};
			img: HTMLAttributes & {
				src?: string;
				alt?: string;
				width?: number | string;
				height?: number | string;
				loading?: string;
				border?: string | number;
				crossorigin?: "anonymous" | "use-credentials" | "";
				decoding?: "sync" | "async" | "auto";
				elementtiming?: string;
				fetchpriority?: "high" | "low" | "auto";
				ismap?: boolean;
				referrerpolicy?: string;
				sizes?: string;
				srcset?: string;
				usemap?: string;
			};
			map: HTMLAttributes & { name?: string };
			track: HTMLAttributes & {
				kind?: string;
				src?: string;
				srclang?: string;
				label?: string;
				default?: boolean;
			};
			video: HTMLAttributes & {
				src?: string;
				controls?: boolean;
				autoplay?: boolean;
				loop?: boolean;
				muted?: boolean;
				poster?: string;
				crossorigin?: "anonymous" | "use-credentials" | "";
				playsinline?: boolean;
				preload?: "none" | "metadata" | "auto";
			};
			embed: HTMLAttributes & {
				src?: string;
				type?: string;
				width?: number | string;
				height?: number | string;
			};
			fencedframe: HTMLAttributes;
			iframe: HTMLAttributes & {
				src?: string;
				name?: string;
				width?: number | string;
				height?: number | string;
				allow?: string;
				csp?: string;
				loading?: "lazy" | "eager";
				referrerpolicy?: string;
				sandbox?: string;
				srcdoc?: string;
			};
			object: HTMLAttributes & {
				data?: string;
				type?: string;
				width?: number | string;
				height?: number | string;
				border?: string | number;
				form?: string;
				usemap?: string;
			};
			picture: HTMLAttributes;
			source: HTMLAttributes & {
				src?: string;
				srcset?: string;
				sizes?: string;
				type?: string;
				media?: string;
			};
			canvas: HTMLAttributes & { width?: number; height?: number };
			math: HTMLAttributes;

			// SVG
			svg: HTMLAttributes & {
				viewBox?: string;
				fill?: string;
				xmlns?: string;
				width?: number | string;
				height?: number | string;
			};
			path: HTMLAttributes & { d?: string; fill?: string };
			circle: HTMLAttributes & {
				cx?: number | string;
				cy?: number | string;
				r?: number | string;
			};
			rect: HTMLAttributes & {
				x?: number | string;
				y?: number | string;
				width?: number | string;
				height?: number | string;
			};

			// Demarcating edits
			del: HTMLAttributes & { cite?: string; datetime?: string };
			ins: HTMLAttributes & { cite?: string; datetime?: string };

			// Table content
			caption: HTMLAttributes;
			col: HTMLAttributes & { span?: number; bgcolor?: string };
			colgroup: HTMLAttributes & { span?: number; bgcolor?: string };
			table: HTMLAttributes & {
				background?: string;
				bgcolor?: string;
				border?: string | number;
			};
			tbody: HTMLAttributes & { bgcolor?: string };
			td: HTMLAttributes & {
				colspan?: number;
				rowspan?: number;
				background?: string;
				bgcolor?: string;
				headers?: string;
			};
			tfoot: HTMLAttributes & { bgcolor?: string };
			th: HTMLAttributes & {
				colspan?: number;
				rowspan?: number;
				scope?: string;
				background?: string;
				bgcolor?: string;
				headers?: string;
			};
			thead: HTMLAttributes & { bgcolor?: string };
			tr: HTMLAttributes & { bgcolor?: string };

			// Forms
			button: HTMLAttributes & {
				type?: string;
				disabled?: boolean;
				form?: string;
				formaction?: string;
				formenctype?: string;
				formmethod?: string;
				formnovalidate?: boolean;
				formtarget?: string;
				name?: string;
				value?: string | number;
			};
			datalist: HTMLAttributes;
			fieldset: HTMLAttributes & {
				disabled?: boolean;
				name?: string;
				form?: string;
			};
			form: HTMLAttributes & {
				action?: string;
				method?: string;
				"accept-charset"?: string;
				autocomplete?: string;
				enctype?: string;
				name?: string;
				novalidate?: boolean;
				target?: string;
			};
			input: HTMLAttributes & {
				type?: InputType;
				name?: string;
				value?: string;
				placeholder?: string;
				disabled?: boolean;
				checked?: boolean;
				accept?: string;
				alpha?: boolean | number;
				capture?: boolean | string;
				colorspace?: string;
				dirname?: string;
				form?: string;
				height?: number | string;
				list?: string;
				max?: number | string;
				maxlength?: number;
				min?: number | string;
				minlength?: number;
				multiple?: boolean;
				pattern?: string;
				readonly?: boolean;
				required?: boolean;
				size?: number;
				step?: number | string;
				usemap?: string;
				width?: number | string;
			};
			label: HTMLAttributes & { for?: string };
			legend: HTMLAttributes;
			meter: HTMLAttributes & {
				value?: number;
				min?: number;
				max?: number;
				low?: number;
				high?: number;
				optimum?: number;
			};
			optgroup: HTMLAttributes & { disabled?: boolean; label?: string };
			option: HTMLAttributes & {
				value?: string | number;
				selected?: boolean;
				disabled?: boolean;
				label?: string;
			};
			output: HTMLAttributes & { for?: string; form?: string; name?: string };
			progress: HTMLAttributes & { value?: number; max?: number };
			select: HTMLAttributes & {
				name?: string;
				value?: string;
				autocomplete?: string;
				disabled?: boolean;
				form?: string;
				multiple?: boolean;
				required?: boolean;
				size?: number;
			};
			selectedcontent: HTMLAttributes;
			textarea: HTMLAttributes & {
				name?: string;
				value?: string;
				rows?: number;
				autocomplete?: string;
				cols?: number;
				dirname?: string;
				disabled?: boolean;
				form?: string;
				maxlength?: number;
				minlength?: number;
				placeholder?: string;
				readonly?: boolean;
				required?: boolean;
				wrap?: "soft" | "hard" | "off";
			};

			// Interactive/disclosure
			details: HTMLAttributes & { open?: boolean };
			dialog: HTMLAttributes & { open?: boolean };
			summary: HTMLAttributes;

			// Experimental
			geolocation: HTMLAttributes;
		}
	}
}
