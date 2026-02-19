# Table

A high-performance data table component with support for sorting, resizing, and virtual scrolling.

## Usage

```tsx
import { Table } from "@fleax/ui";

const columns = [
  { id: "name", header: "Name", accessor: (d) => d.name, sort: true },
  { id: "email", header: "Email", accessor: (d) => d.email },
];

const data = [
  { id: "1", name: "John Doe", email: "john@example.com" },
  { id: "2", name: "Jane Smith", email: "jane@example.com" },
];

export default () => (
  <Table data={data} columns={columns} getRowId={(d) => d.id}>
    <Table.Header />
    <Table.Body />
  </Table>
);
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | `[]` | Array of data items |
| `columns` | `Column<T>[]` | `[]` | Column definitions |
| `getRowId` | `(item: T) => string \| number` | `-` | Function to get unique ID for each row |
| `virtual` | `boolean` | `false` | Enable virtual scrolling for large datasets |
| `height` | `number` | `undefined` | Height of the scroll container (required for virtual scrolling) |
| `rowHeight` | `number` | `48` | Height of each row in pixels |

## Column Definition

```ts
type Column<T> = {
  id: string;
  header: string | VNode;
  accessor: (item: T) => VNode | string | number;
  sort?: boolean;
  resizable?: boolean;
  width?: number;
};
```

## Features

### Sorting
Enable sorting on a column by setting `sort: true`. Sorting is handled on the client side via an Island.

### Virtual Scrolling
For large datasets (e.g., 10,000 rows), enable `virtual` and provide a `height`. Only the visible rows will be rendered in the DOM, significantly improving performance.

### Resizing
Set `resizable: true` in your column definition to allow users to drag and resize columns.
