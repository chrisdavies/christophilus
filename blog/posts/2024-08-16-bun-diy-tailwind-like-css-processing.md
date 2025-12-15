# Bun DIY: Tailwind Lite

When I started my zero-dependency Bun application experiment, I had no plans to build a CSS processing layer. My plan was to just hand-roll my CSS like any self-respecting neanderthal. *But...* I'd forgotten how much I like the convenience of fire and wheels and tools and suchlike. Within a few minutes, I was already well on my way to writing a steaming pile of unmaintainable spaghetti. Thus, I decided to write Tailwind from scratch with zero dependencies.

[Here's what that looks like](https://github.com/chrisdavies/atomic-css). Take a look under the hood, and poke around if you dare.

## Building Tailwind from scratch

Tailwind is huge, and I don't use all of it. I figured the 80/20 rule would give me a good shot at building something useful without spending the rest of my life doing it.

What I built supports:

- The basic rules (e.g. `p-2 m-8 bg-red-600`)
- Pseudo selectors (e.g. `hover:bg-blue-600`)
- Responsive breakpoints (e.g. `md:w-full`)
- Dark / light mode (e.g. `dark:bg-gray-800`)
- CSS file `@tailwind base;` and `@tailwind utilities` slots
- Extracting rules from `@layer utilities`
- Inlining relative `@import` files
- Efficient, incremental builds in watch-mode
- Customization via configuration
- Reusing rules in CSS files with the `@apply` directive

I won't bore you with a comprehensive list of what the library *doesn't* support, but there are three big missing features that I should note:

- No custom rules (e.g. `text-[240rem]`)
- No themes or plugins
- Only basic `@apply` support— no pseudo-selectors

The lack of custom rules isn't a huge deal to me, as I never use them. If I really need a custom rule, I create one in my CSS file, generally in the utilities layer.

Themes and plugins are similarly not a thing I care about. Supporting them would probably add a lot of complexity, and I don't need them for my use-case.

As for the limited implementation of `@apply`, it turns out that you can get 80% of the value of the components layer by writing something like this:

```css
@layer components {
  .yourselector {
    @apply bg-red-600 text-white;
    &:hover {
      @apply bg-sky-600;
    }
    @media (min-width: 48rem) {
      @apply w-full;
    }
  }
}
```

That is the equivalent of this Tailwind component:

```css
@layer components {
  .yourselector {
    @apply bg-red-600 text-white hover:bg-sky-600 md:w-full;
  }
}
```

The inability to reuse breakpoints via `@apply` is probably the biggest drawback to my simplified approach.


## How it works

The atomic-css layer works roughly like this:

- Build the full configuration by merging the user and default configurations
- Generate a (massive) rule lookup table based on the configuration
- Load the CSS (any any CSS referenced by basic @import statements)
- Extract utility rules from the CSS and update the lookup table with them
- Expand the `@apply` directives based on the lookup table rules
- Scan the source directories, extracting any Tailwind-like class names
- Create a set of all of the referenced rules
- Convert that set to the final CSS

For example, here's a simplified subset of the rules table that we generate from the config:

```ts
const rules = {
 'text-sky-500/50': {
    css: `color: rgb(14 165 233 / 0.5);`,
    // etc...
  },
};
```

When we scour the source for class names, we come across this: `dark:hover:text-sky-500/50`.

We parse this into two parts:

```ts
{
  pseudos: ['dark', 'hover'],
  name: 'text-sky-500/50',
}
```

We then look up the rule by name and find our definition.

Finally, we build an output rule:

```ts
{
  selector: '.dark dark\:hover\:text-sky-500\/50:hover',
  css: `color: rgb(14 165 233 / 0.5);`,
  // etc...
}
```

Before we write our final CSS, we deduplicate references, combine selectors where possible, etc, and finally write a CSS file that contains only the rules we actually use in our application, in a relatively compact form.

Everything was pretty simple to implement, but I did cut some corners. The [CSS parser](https://github.com/chrisdavies/atomic-css/blob/main/lib/atomic-css/css-parser.ts) is particularly naive. It has many flaws. For example, it treats `@layer base;` and `@layer 'base';` as two distinct values. But for my purposes, it's fine. It should gracefully handle all of the CSS I've ever written in my career.

## The result

This was a lot more work than I anticipated— more than the single weekend that I usually allocate for such projects. Much of the work was copy / pasting rules from Tailwind's excellent docs. This was tedious. Maybe I should have automated it. Take a look at the [rule-gen.ts](https://github.com/chrisdavies/atomic-css/blob/main/lib/atomic-css/rule-gen.ts) file to see what I mean by tedious.

In the end, I got a working solution up and running fairly quickly. I'm sure there are plenty of bugs and unintentionally missing features, but the proof of concept is there. And even though it's not a thorough implementation, it's enough to warrant some observations.

The code is quite fast, and I haven't bothered to optimize it. It performs a full build of my $dayjob codebase in around 175 milliseconds compared to over 2 seconds for Tailwind. Incremental builds are similarly fast. This solves a real pain-point I've had with Tailwind, and makes me wonder if it's worth turning this into a full-fledged, production-ready library.

I'm not 100% sure exactly why it's so much faster, but I have a pretty good hunch:

- I've only implemented a subset of Tailwind, so I'm doing less
- Tailwind is pluggable— my library is not
- Tailwind ties into postcss and other tools, where my tool is standalone
- Tailwind supports complex rules which prevent the lookup table approach

I suspect this last point accounts for most of the difference. Converting a class name to a CSS rule is an O(1) operation for my library. Tailwind could use this same technique for many of its rules, but not for all of them (e.g. custom value class names wouldn't work), so I'd guess that Tailwind runs a less optimal, but more extensible algorithm for matching class names to rules.

## Future optimizations n' such

The lookup table is big. Colors are to blame. For every color, we generate many rules: bg, text, border, gradient stops, etc, and *all* of the opacity variations of those. This consumes a few megs of RAM, and takes around 30ms to generate on my dev laptop. An optimization I may consider in the future is to lazily generate the opacity variants (e.g. `text-white/50`) rather than eagerly generating them.

## Footnote: why Tailwind?

Before I wrap up, I thought I'd explain why I like Tailwind so much.

I've worked on web applications for over 20 years, and without fail, in every project I worked on, the CSS was the worst part.

We all know that we should generally avoid globals in our programs. Any seasoned programmer works to avoid side-effects. Avoiding global, mutable state produces simpler programs, as anyone who has flirted with functional programming can attest. And yet, with CSS, we essentially have a language in which all variables are global and any change you make will probably have unanticipated side-effects.

On a long-running, large project, the CSS requires superhuman discipline and organizational thought. Find a web application that is older than 5 years, and you'll find all sorts of dead CSS that is still sitting there because folks are too afraid to touch it. This is so common that you could accurately describe legacy CSS as an append-only language.

> There are only two hard things in Computer Science: cache invalidation and naming things.
>
>    — Phil Karlton

CSS requires you to invent names. A lot of names. You have to name every. Single. Thing. Naming is hard, ergo CSS is hard.

Maintainable code requires two things: the ability to fearlessly delete and refactor, and the ability to reason locally. If you hop into a simple component you should be able to read it quickly from top to bottom, understand what it does, and make the changes you want. The more files you have to jump between, the harder this task becomes. Understandability is impeded by separating concerns across CSS / JS / HTML boundaries rather than across component boundaries. The traditional approach to hand-rolling CSS ensures that you're always jumping between at least two files in order to reason about a component.

Tailwind solves all of these problems, and it solves it elegantly. With Tailwind, you get:

- Fearless refactoring
- Minimal side-effects
- Only the rules actively used by your application end up in your CSS
- Far less time spent naming things
- Locality of reasoning

Tailwind is functional programming for CSS. I love it.

