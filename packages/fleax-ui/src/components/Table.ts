import { Island, jsx, renderToString } from "@fleax/core";
import * as zlib from "node:zlib";
import {
	type Column,
	getTableModel,
	normalizeTableState,
	type TableStateInput,
} from "./tableCore.js";

import "./Table.css";

export type TableProps<T> = {
	data: readonly T[] | (() => readonly T[]);
	columns: Column<T>[];
	state?: TableStateInput;
	getRowId?: (row: T, index: number) => string;
	class?: string;
	children?: unknown;
	virtual?: boolean;
	height?: number | string;
	stickyHeader?: boolean;
	refreshPeriod?: number;
	rowHeight?: number;
};

export const Table = <T>({
	data: dataInput,
	columns,
	state: stateInput,
	getRowId,
	class: className,
	children,
	virtual,
	height,
	stickyHeader = true,
	refreshPeriod,
	rowHeight = 48,
}: TableProps<T>) => {
	const data = typeof dataInput === "function" ? dataInput() : dataInput;
	const state = normalizeTableState(
		virtual && !stateInput?.pagination
			? { ...stateInput, pagination: { pageSize: 100000 } }
			: stateInput,
	);
	const model = getTableModel({ data, columns, getRowId, state });

	const renderedChildren =
		typeof children === "function" ? children(model) : children;

	const injectProps = (child: any): any => {
		if (!child || typeof child !== "object") return child;
		if (Array.isArray(child)) return child.map(injectProps);
		if (child.type) {
			if (child.type === TableHeader)
				return { ...child, props: { columns, state, ...child.props } };
			if (child.type === TableBody)
				return { ...child, props: { model, columns, virtual, ...child.props } };
			if (child.props?.children) {
				return {
					...child,
					props: {
						...child.props,
						children: injectProps(child.props.children),
					},
				};
			}
		}
		return child;
	};

	const finalChildren = injectProps(renderedChildren);

	const allData = virtual
		? model.pageRows.map((r) => ({
				id: r.id,
				selected: r.isSelected,
				sortValues: r.sortValues,
				cells: columns.map((col) => {
					const val = r.cells[col.id];
					const isSimple =
						typeof val === "string" ||
						typeof val === "number" ||
						typeof val === "boolean";
					return {
						align: col.align,
						val: isSimple ? val : undefined,
						html: !isSimple ? renderToString(val) : undefined,
					};
				}),
			}))
		: null;

	let serializedData = "";
	let isCompressed = false;

	if (allData) {
		const payload = { state, data: allData };
		const json = JSON.stringify(payload);
		if (json.length > 5000) {
			try {
				const compressed = zlib.gzipSync(Buffer.from(json));
				const base64 = compressed.toString("base64");
				if (base64.length < json.length) {
					serializedData = base64;
					isCompressed = true;
				} else serializedData = json;
			} catch {
				serializedData = json;
			}
		} else serializedData = json;
	}

	const containerStyle = [
		height
			? `height: ${typeof height === "number" ? height + "px" : height}`
			: "",
		`--fleax-row-height: ${rowHeight}px`,
		"overflow: auto",
	]
		.filter(Boolean)
		.join(";");

	return jsx("div", {
		class: `fleax-table-container ${className || ""}`,
		style: containerStyle,
		"data-virtual": virtual ? "true" : undefined,
		"data-row-height": rowHeight,
		"data-total-rows": virtual ? model.rows.length : undefined,
		"data-sticky-header": stickyHeader ? "true" : undefined,
		"data-refresh-period": refreshPeriod,
		children: [
			jsx(Island as any, {
				src: "@fleax/ui/islands/table",
				children: [
					jsx("table", {
						class: "fleax-table",
						role: "table",
						children: finalChildren || [
							jsx(TableHeader as any, { columns, state }),
							jsx(TableBody as any, { model, columns, virtual }),
						],
					}),
					allData &&
						jsx("script", {
							class: "fleax-table-data",
							type: "application/json",
							"data-compressed": isCompressed ? "true" : undefined,
							children: serializedData,
						}),
				],
			}),
		],
	});
};

export const TableHeader = ({ columns, state }: any) => {
	return jsx("thead", {
		class: "fleax-table-header",
		children: jsx("tr", {
			role: "row",
			children: columns.map((column: any) =>
				jsx("th", {
					role: "columnheader",
					"data-col-id": column.id,
					style: column.width ? `width: ${column.width}px` : undefined,
					"data-sticky": column.sticky ? "true" : undefined,
					children: [
						column.header,
						column.sort &&
							jsx("span", {
								class: "fleax-table-sort-icon",
								children: jsx("span", {
									class: "fleax-table-sort-icon-inner",
									children:
										state.sort?.id === column.id
											? state.sort.dir === "asc"
												? "↑"
												: "↓"
											: "↕",
								}),
							}),
						column.resizable && jsx("div", { class: "fleax-table-resizer" }),
					],
				}),
			),
		}),
	});
};

export const TableBody = ({ model, columns, virtual }: any) => {
	const displayRows = virtual ? model.pageRows.slice(0, 200) : model.pageRows;
	return jsx("tbody", {
		class: "fleax-table-body",
		children: displayRows.map((row: any) =>
			jsx(TableRow as any, {
				id: row.id,
				selected: row.isSelected,
				children: columns.map((column: any) =>
					jsx(TableCell as any, {
						align: column.align,
						children: column.accessor(row.original),
					}),
				),
			}),
		),
	});
};

export const TableRow = ({ children, selected, id }: any) => {
	return jsx("tr", {
		role: "row",
		tabindex: 0,
		"data-row-id": id,
		"data-selected": selected ? "true" : "false",
		"aria-selected": selected ? "true" : "false",
		children,
	});
};

export const TableCell = ({ children, align }: any) => {
	return jsx("td", {
		role: "cell",
		style: align ? `text-align: ${align}` : undefined,
		children,
	});
};

export const TableFooter = ({ children }: { children?: unknown }) => {
	return jsx("tfoot", { class: "fleax-table-footer", children });
};

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.Footer = TableFooter;
