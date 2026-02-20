async function decompress(base64: string) {
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	const stream = new Blob([bytes])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	const reader = stream.getReader();
	let result = "";
	const decoder = new TextDecoder();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		result += decoder.decode(value, { stream: true });
	}
	return JSON.parse(result + decoder.decode());
}

export default async (root: HTMLElement) => {
	const table = root.querySelector("table") as HTMLTableElement;
	const container = root.closest(".fleax-table-container") as HTMLElement;
	if (!table || !container) return;

	const isVirtual = container.dataset.virtual === "true";
	const tbody = table.querySelector("tbody");
	if (!tbody) return;

	let rowHeight = parseInt(container.dataset.rowHeight || "48", 10);
	const firstRow = tbody.querySelector("tr");
	if (firstRow) {
		const measured = firstRow.offsetHeight;
		if (measured > 0) rowHeight = measured;
	}

	const dataScript = root.querySelector(
		".fleax-table-data",
	) as HTMLScriptElement;
	let allData: any[] = [];
	if (dataScript) {
		try {
			const payload =
				dataScript.dataset.compressed === "true"
					? await decompress(dataScript.textContent || "")
					: JSON.parse(dataScript.textContent || "{}");
			allData = payload.data || [];
		} catch (e) {
			console.error("[fleax-table] Load failed", e);
		}
	}

	let startIndex = -1,
		visibleCount = 0,
		ticking = false;

	const render = () => {
		if (!isVirtual || allData.length === 0) return;

		const endIndex = Math.min(allData.length, startIndex + visibleCount);
		const visibleData = allData.slice(startIndex, endIndex);

		// Use padding on tbody to maintain height and native scrolling.
		// This is cleaner and doesn't break sticky headers.
		tbody.style.paddingTop = `${startIndex * rowHeight}px`;
		tbody.style.paddingBottom = `${(allData.length - endIndex) * rowHeight}px`;

		const fragment = document.createDocumentFragment();
		visibleData.forEach((rowData: any) => {
			const tr = document.createElement("tr");
			tr.role = "row";
			tr.tabIndex = 0;
			tr.dataset.rowId = rowData.id;
			tr.dataset.selected = rowData.selected ? "true" : "false";

			rowData.cells.forEach((cell: any) => {
				const td = document.createElement("td");
				if (cell.align) {
					if (cell.align === "center") td.style.justifyContent = "center";
					else if (cell.align === "end") td.style.justifyContent = "flex-end";
				}
				if (cell.val !== undefined) td.textContent = String(cell.val);
				else td.innerHTML = cell.html;
				tr.appendChild(td);
			});
			fragment.appendChild(tr);
		});

		tbody.replaceChildren(fragment);
		ticking = false;
	};

	const update = () => {
		if (!isVirtual || ticking) return;
		ticking = true;
		requestAnimationFrame(() => {
			const style = window.getComputedStyle(container);
			const isWindow =
				style.overflowY !== "auto" &&
				style.overflowY !== "scroll" &&
				style.height === "auto";
			const scrollTop = isWindow
				? Math.max(
						0,
						window.scrollY -
							(container.getBoundingClientRect().top + window.scrollY),
					)
				: container.scrollTop;
			const height = isWindow ? window.innerHeight : container.offsetHeight;

			const nextStart = Math.max(0, Math.floor(scrollTop / rowHeight) - 10);
			const nextCount = Math.ceil(height / rowHeight) + 20;

			if (nextStart !== startIndex || nextCount !== visibleCount) {
				startIndex = nextStart;
				visibleCount = nextCount;
				render();
			} else ticking = false;
		});
	};

	if (isVirtual && allData.length > 0) {
		tbody.innerHTML = "";
		const target =
			window.getComputedStyle(container).overflowY === "auto"
				? container
				: window;
		target.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		update();
	}

	table.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		const header = target.closest("th");
		const row = target.closest("tr");

		if (
			header &&
			(header.querySelector(".fleax-table-sort-icon") || header.dataset.colId)
		) {
			const colId =
				header.dataset.colId ||
				String(
					Array.from(header.parentElement?.children ?? []).indexOf(header),
				);
			const dir = header.dataset.sortDir === "asc" ? "desc" : "asc";
			table.querySelectorAll("th").forEach((th) => {
				delete th.dataset.sortDir;
			});
			header.dataset.sortDir = dir;

			if (isVirtual) {
				const first = allData[0]?.sortValues || {};
				const actualId =
					first[colId] !== undefined
						? colId
						: Object.keys(first)[parseInt(colId, 10)];
				allData.sort((a, b) => {
					const vA = a.sortValues[actualId],
						vB = b.sortValues[actualId];
					return dir === "asc" ? (vA > vB ? 1 : -1) : vA < vB ? 1 : -1;
				});
				startIndex = -1;
				update();
			}
		}

		if (row?.dataset.rowId && row.parentElement?.tagName === "TBODY") {
			const sel = row.dataset.selected !== "true";
			row.dataset.selected = String(sel);
			if (isVirtual) {
				const item = allData.find((d: any) => d.id === row.dataset.rowId);
				if (item) item.selected = sel;
			}
		}
	});

	table.addEventListener("keydown", (e) => {
		const row = (document.activeElement as HTMLElement)?.closest("tr");
		if (!row) return;
		if (e.key === "ArrowDown") (row.nextElementSibling as HTMLElement)?.focus();
		else if (e.key === "ArrowUp")
			(row.previousElementSibling as HTMLElement)?.focus();
		else if (e.key === " ") {
			e.preventDefault();
			row.click();
		}
	});
};
