# Bun: Zero-Dependency Server-Side JSX

I'm building a little, zero-dependency application with Bun. Bun comes with JSX support out of the box, but it took a bit of digging to get things working with no dependencies.

I figured I'd explain the process.

## tsconfig

First, we need to tell Bun / TypeScript where our JSX rendering logic lives. We'll put everything in `lib/jsx`:

Add the following `compilerOptions` to `tsconfig.json`:

```json
"jsx": "react-jsx",
"jsxImportSource": "lib/jsx",
```

And modify your `paths` to have an entry like this:

```json
"lib/*": ["./lib/*"]
```

So, with unrelated stuff omitted, your `tsconfig.json` should be a superset of this:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "lib/jsx",
    "baseUrl": ".",
    "paths": {
      "lib/*": ["./lib/*"]
    }
  }
}
```

## lib/jsx

We'll put all of our logic into `lib/jsx/index.ts`, so go ahead and create that.

Bun and other transpilers expect a few other files which we'll need to create:

- `lib/jsx/jsx-runtime.ts`
- `lib/jsx/jsx-dev-runtime.ts`

And they both look like this:

```js
export * from './index';
```

Now, let's write `index.ts`:

The bulk of the logic will be in our `h` function:

```ts
export function h(args) {
  console.log(args);
  return 'TODO...';
}

export const jsxDEV = h;
export const jsx = h;
```

You can test that by creating `test.tsx`:

```tsx
console.log(<h1>It is now {new Date().toISOString()}</h1>);
```

If you run that using `bun test.tsx`, you'll see the shape of the args passed to the h function.

## Escaping user input

Before we jump into the code, there's something worth noting. Bun comes with a handy `escapeHTML` function which I use in my JSX rendering logic. If you want to use any templates from the client, you'll want to use your own escape logic. It might look something like this:

```ts
const chars: Record<string, string> = {
  [`"`]: '&quot;',
  [`&`]: '&amp;',
  [`'`]: '&#x27;',
  [`<`]: '&lt;',
  [`>`]: '&gt;',
};

const htmlEscapeRegex = /["&'<>]/g;

function esc(s: string) {
  return s.replaceAll(htmlEscapeRegex, (ch) => chars[ch]);
}
```

## Source

Here's a look at the final implementation:

```ts
// Bun / other transpilers expect these to be defined if jsx mode is
// react-jsx and jsxImportSource is used.
export const jsxDEV = h;
export const jsx = h;

// We'll use this to identify when a child is the result of a nested JSX
// expression. In that case, we don't want to escape the resulting HTML.
const $jsx = Symbol();

// This is what we'll return from our h function. It allows us to get access
// to the raw HTML. The $jsx property helps us identify JSX output when
// dealing with nested components.
export type JSXResult = {
  $jsx: Symbol;
  value: string;
};

// These are self-closing tags such as <img /> <br />, and need special
// treatment so that we avoid generating something invalid like <img></img>.
const voidElementNames = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

// Determine if arg is a potentially dangerous href value.
function isPotentiallyDangerousURL(arg: string) {
  return (
    // If the href contains a : (58 is the unicode value for :)
    (arg.includes(':') || arg.includes('&#58;')) &&
    // And it doesn't start with http:// or https://
    !fullyQualifiedURLRegex.test(arg)
  );
}

// Determine if a value is a JSXResult
function isJSXResult(o: any): o is JSXResult {
  return o?.$jsx === $jsx;
}

// Convert a child / children to HTML. We may get various shapes of
// data as children: strings / literal values / arrays / nested
// JSX values, etc.
function stringifyChild(child: any): string {
  if (Array.isArray(child)) {
    return child.map(stringifyChild).join('');
  }
  if (typeof child === 'string') {
    return Bun.escapeHTML(child);
  }
  if (isJSXResult(child)) {
    return child.value;
  }
  if (child != null && child !== false) {
    return Bun.escapeHTML(`${child}`);
  }
  return '';
}

// Convert an object to HTML attributes. We'll handle functions specially
// so that we can write simple event handlers on the server, and have the
// code execute on the client.
function stringifyAttrs(attrs: Record<string, any>) {
  let result = '';
  for (const k in attrs) {
    let value = attrs[k];

```
// We want to specifically handle boolean attributes and treat them
// as an add / remove operation. For example:
//
// <input checked={true} />  -> <input checked />
// <input checked={false} /> -> <input />
if (typeof value === 'boolean') {
  value && (result += ` ${k}`);
  continue;
}

// Convert functions to strings, presumably as an event-handler.
// This would take something like this:
//
//   onClick={(e) => { document.title = e.target.textContent; }}>
//
// And convert it to this:
//
//   onClick="((e) => { document.title = e.target.textContent; })(event)"
if (typeof value === 'function' && k.startsWith('on')) {
  value = `(${value})(event)`;
}

// It can be handy to embed view HTML as an attribute (e.g. so that client
// scripts can then make use of conditional HTML). This allows us to do
// something like this:
//
// data-moon-icon={<svg>...</svg>}
if (isJSXResult(value)) {
  value = value.value;
}
// We want to disallow dangerous href values like javascript:alert("hi").
if (typeof value === 'string' && k === 'href' && isPotentiallyDangerousURL(value)) {
  // We have a potentially dangerous href value, so we'll
  // make it blank.
  value = '';
}
result += ` ${k}="${Bun.escapeHTML(value)}"`;
```
  }
  return result;
}

// Fragments are how React and friends represent JSX results that contain
// multiple leafs without having a wrapper element.
export function Fragment(...args: Array<{ children: any[] }>) {
  return { $jsx, value: args.flatMap((arg) => stringifyChild(arg.children)).join('') };
}

// The first argument is either a tagName or a function. That is, it is either
// something like "div" or "h1", or it is a function which is itself a JSX
// component such as:
//
// const Hello(props) => <h1>Hello {props.name}</h1>
export function h(tagOrFn: string | ((props: any) => any), props: any): JSXResult {
  // We have a function component
  if (typeof tagOrFn === 'function') {
    const result = tagOrFn(props);
    // If a functioni component returns anything other than a JSXResult,
    // we don't want its output to show up in our final result.
    return isJSXResult(result) ? result : { $jsx, value: '' };
  }

  // We're dealing with a tagName like "h1", etc
  const { children, dangerouslySetInnerHTML, ...attrs } = props;
  const content = dangerouslySetInnerHTML
    ? dangerouslySetInnerHTML.__html
    : stringifyChild(children);

  // We have a self-closing tag
  if (voidElementNames.has(tagOrFn)) {
    return { $jsx, value: `<${tagOrFn}${stringifyAttrs(attrs)} />` };
  }
  return { $jsx, value: `<${tagOrFn}${stringifyAttrs(attrs)}>${content}</${tagOrFn}>` };
}

// This helper lets us change the shape of JSXResult without breaking
// callers.
export function renderToString(result: JSXResult) {
  return result.value;
}
```

