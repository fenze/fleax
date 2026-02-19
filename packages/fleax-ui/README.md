# @fleax/ui

A collection of lightweight, accessible UI components built for **@fleax/core**.

## Features

- **Zero Runtime JS**: Components are rendered to static HTML.
- **Islands Support**: Complex components (like Table) automatically hydrate when needed.
- **Native CSS**: Styles are bundled and extracted using @fleax/core's CSS pipeline.
- **Type Safe**: Full TypeScript support for all components and props.

## Installation

```bash
npm install @fleax/ui
```

Note: `@fleax/ui` requires `@fleax/core` as a peer dependency.

## Usage

### Basic Components

```tsx
import { Button, Badge, Flex } from "@fleax/ui";

export default (
  <Flex gap="md" align="center">
    <h1>Project Title</h1>
    <Badge variant="success">Active</Badge>
    <Button variant="solid" onclick="alert('Hello!')">
      Click Me
    </Button>
  </Flex>
);
```

### Complex Components (Islands)

Some components like `Table` use Islands for client-side interactivity (sorting, resizing) while maintaining SSR performance.

```tsx
import { Table } from "@fleax/ui";

const data = [
  { id: 1, name: "Item 1", status: "ok" },
  { id: 2, name: "Item 2", status: "error" },
];

const columns = [
  { id: "name", header: "Name", accessor: (d) => d.name, sort: true },
  { id: "status", header: "Status", accessor: (d) => d.status },
];

export default (
  <Table data={data} columns={columns} getRowId={(d) => d.id}>
    <Table.Header />
    <Table.Body />
  </Table>
);
```

## Styling

Styles are scoped per-component and imported automatically. If you want to import the entire component library's CSS at once:

```ts
import "@fleax/ui/styles.css";
```

## Components

- `Button` - Interactive buttons with variants and sizes.
- `Badge` - Status indicators and labels.
- `Table` - High-performance data table with sorting and virtual scrolling.
- `Input` / `Field` / `Label` - Accessible form primitives.
- `Flex` - Layout container.
- `Kbd` - Keyboard shortcut displays.

## License

MIT
