# Button

A versatile button component with support for variants, sizes, and states.

## Usage

```tsx
import { Button } from "@fleax/ui";

export default () => (
  <Button 
    variant="solid" 
    size="md" 
    onclick="alert('Hello')"
  >
    Click Me
  </Button>
);
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'solid' \| 'outline' \| 'ghost' \| 'secondary' \| 'link'` | `'solid'` | Visual style variant |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `children` | `VNode \| string` | `undefined` | Button content |
| `...attrs` | `JSX.IntrinsicElements["button"]` | `-` | Any standard button attributes (onclick, type, disabled, etc.) |
