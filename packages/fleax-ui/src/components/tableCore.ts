export type SortDirection = "asc" | "desc";

export type Column<T> = {
	id: string;
	header: unknown;
	accessor: (row: T) => unknown;
	sort?: boolean;
	sortAccessor?: (row: T) => string | number | Date | null | undefined;
	filter?: (row: T, query: string) => boolean;
	filterAccessor?: (row: T) => string;
	width?: number;
	minWidth?: number;
	maxWidth?: number;
	align?: "start" | "center" | "end";
	resizable?: boolean;
	class?: string;
	sticky?: "left" | "right";
};

export type TableSort = { id: string; dir: SortDirection } | null;
export type TablePagination = { page: number; pageSize: number };

export type TableState = {
	sort: TableSort;
	pagination: TablePagination;
	selection: Set<string>;
	filter: string;
	expanded: Set<string>;
};

export type TableStateInput = Partial<
	Omit<TableState, "pagination" | "selection" | "expanded">
> & {
	pagination?: Partial<TablePagination>;
	selection?: Iterable<string>;
	expanded?: Iterable<string>;
};

export type TableRowModel<T> = {
	id: string;
	index: number;
	original: T;
	cells: Record<string, unknown>;
	sortValues: Record<string, string | number>;
	filterText: string;
	isSelected: boolean;
	isExpanded: boolean;
};

export type TableModel<T> = {
	allRows: TableRowModel<T>[];
	rows: TableRowModel<T>[];
	pageRows: TableRowModel<T>[];
	totalRows: number;
	totalPages: number;
	page: number;
	pageSize: number;
};

const toText = (v: unknown): string => {
	if (typeof v === "string") return v;
	if (typeof v === "number" || typeof v === "boolean") return String(v);
	return v instanceof Date ? v.toISOString() : "";
};

const toComparable = (v: unknown): string | number => {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (v instanceof Date) return v.getTime();
	const s = toText(v).trim();
	const n = Number(s);
	return s !== "" && Number.isFinite(n) ? n : s.toLowerCase();
};

const compare = (a: string | number, b: string | number) => {
	if (typeof a === "number" && typeof b === "number") return a - b;
	return String(a).localeCompare(String(b), undefined, {
		numeric: true,
		sensitivity: "base",
	});
};

const clamp = (v: number, min: number, max: number) =>
	Math.min(max, Math.max(min, v));

const DEFAULT_STATE: TableState = {
	sort: null,
	pagination: { page: 1, pageSize: 10 },
	selection: new Set(),
	expanded: new Set(),
	filter: "",
};

export const normalizeTableState = (state?: TableStateInput): TableState => {
	const p = state?.pagination;
	return {
		sort: state?.sort ?? DEFAULT_STATE.sort,
		filter: state?.filter ?? DEFAULT_STATE.filter,
		pagination: {
			page: Math.max(1, Math.floor(p?.page ?? DEFAULT_STATE.pagination.page)),
			pageSize: Math.max(
				1,
				Math.floor(p?.pageSize ?? DEFAULT_STATE.pagination.pageSize),
			),
		},
		selection: new Set(state?.selection ?? DEFAULT_STATE.selection),
		expanded: new Set(state?.expanded ?? DEFAULT_STATE.expanded),
	};
};

export const getTableModel = <T>({
	columns,
	data,
	getRowId,
	state,
}: {
	columns: Column<T>[] | readonly Column<T>[];
	data: readonly T[];
	getRowId?: (row: T, index: number) => string;
	state: TableState;
}): TableModel<T> => {
	const resolveId = getRowId ?? ((_, i) => `row-${i + 1}`);

	const allRows = data.map((row, index) => {
		const cells: Record<string, unknown> = {};
		const sortValues: Record<string, string | number> = {};
		const filterParts: string[] = [];
		const id = resolveId(row, index);

		for (const col of columns) {
			const val = col.accessor(row);
			cells[col.id] = val;
			sortValues[col.id] = toComparable(
				col.sortAccessor ? col.sortAccessor(row) : val,
			);
			filterParts.push(
				col.filterAccessor ? col.filterAccessor(row) : toText(val),
			);
		}

		return {
			id,
			index,
			original: row,
			cells,
			sortValues,
			filterText: filterParts.join(" ").toLowerCase(),
			isSelected: state.selection.has(id),
			isExpanded: state.expanded.has(id),
		};
	});

	let rows = allRows;
	if (state.filter.trim()) {
		const query = state.filter.toLowerCase();
		rows = rows.filter(
			(r) =>
				columns.some((c) => c.filter?.(r.original, query)) ||
				r.filterText.includes(query),
		);
	}

	if (state.sort) {
		const { id, dir } = state.sort;
		rows = [...rows].sort((a, b) =>
			compare(a.sortValues[id], b.sortValues[id]),
		);
		if (dir === "desc") rows.reverse();
	}

	const totalRows = rows.length;
	const pageSize = Math.max(1, state.pagination.pageSize);
	const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
	const page = clamp(state.pagination.page, 1, totalPages);
	const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

	return { allRows, rows, pageRows, totalRows, totalPages, page, pageSize };
};
