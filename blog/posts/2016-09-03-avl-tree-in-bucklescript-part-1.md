# AVL tree in Bucklescript (part 1)

I thought I'd use Bucklescript to write a demo of [Dijkstra's algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm). But to do that properly, I need to have a [priority queue](https://en.wikipedia.org/wiki/Priority_queue). And the best data structure for a priority queue is an [AVL tree](https://en.wikipedia.org/wiki/AVL_tree). *Phew* So, that's what we're going to start here.

If you haven't already, check out the [Bucklescript getting started]({{ site.baseurl }}{% post_url 2016-09-03-getting-started-with-bucklescript %}) post.


## What is an AVL tree?

An AVL tree is a binary search tree that is always balanced. What does that mean in plain English? A binary search tree is a data structure that allows for fast inserts, deletions, and searches while also keeping its data sorted. It's the perfect thing for a priority queue. A binary search tree might look like this:

```
         5
        / \
       3   10
      / \
     2   4
```

As you can see, finding any item in this structure would take at most 3 comparisons, even though there are 5 items in the structure. Even with huge trees, searching takes at most `depth(tree)` comparisons or in big O parlance, `O(log n)` comparisons.

But this is also a valid binary search tree:

```
         2
          \
           3
            \
             4
              \
               5
                \
                 10
```

In this case, to find node 10, we have to do 5 comparisons. Not so good. This is an unbalanced tree. It's right-heavy. Unbalanced trees can take up to `O(n)` comparisons. How do we fix this? We balance it. How do we do that? We implement our binary tree as an AVL, which has the nice property of always staying balanced.


## Defining a tree node

A binary search tree is composed of a bunch of nodes, where a node has a value, a left, and a right. AVL tree nodes need an extra property: `balance`. The `balance` property is defined as:

- -1 if the node's left branch is deeper than its right
- 0 if the node's left and right branches are the same depth
- 1 if the node's left branch is shallower than its right

Let's create a source file `src/avl.ml`:

```ocaml

(** avl_node represents a single node in an AVL tree. *)
type 'a avl_node =
  { value   : 'a;
    left    : 'a avl_node option;
    right   : 'a avl_node option;
    balance : int; (** -1 is left-heavy, 0 is balanced, 1 is right-heavy *)
  }

```

Let's break down that code.

The `(** ... *)` block is a documentation comment. Comments in OCaml look like `(* ... *)`. They have the nice property of being recursive, so you can nest them infinitely without running into the stupid problem you have with C-style comments where `*/` ends the block comment, no matter how many `/*` preceeded it.

The `type 'a avl_node =` line declares a new type. We're naming it `avl_node`. Pretty self-explanatory. But what's the `'a` doing there? It's a type parameter. It's like generics in C# or templating in C++. It basically allows us to define avl_nodes which have string values, or int values, or foo values. The kind of value an avl_node will hold is not defined by avl_node itself. If it's not clear now, hopefully it will be when we start using avl_nodes in a bit.

The `value   : 'a;` says that an avl_node has a field named `value` of type `'a`. (So, if `'a` is an int, then we'll have an avl_node whose value is an integer.)

The `left    : 'a avl_node option;` says that an avl_node has a field named `left` whose value is an other avl_node. The `option` tacked on to the end of the type declaration means that left may or may not have a value.

OCaml doesn't really have the concept of NULL. NULL is really a bug in language design. OCaml and many other functional languages don't support NULL values. Instead, they have the concept of optional values. An optional value either has a value or is `None`. How does it differ from NULL? OCaml won't compile if you don't properly handle `None` cases. In other words, if you write OCaml code, you'll never see a NULL pointer exception again (except maybe if you call into JavaScript or other unsafe code).

## Defining a binary search tree

Before we write an AVL tree, let's get a binary search tree working.

## Inserting a node

Let's define a function `insert_node` which inserts a node into a tree.

```ocaml
let rec insert_node v root =
  let result = match root with
    | None                    -> {value=v; left=None; right=None; balance=0}
    | Some n when v > n.value -> { n with right = insert_node v n.right }
    | Some n when v < n.value -> { n with left = insert_node v n.left }
    | Some n                  -> n
  in Some result
```

This line `let rec insert_node root v =` says, insert_node is a recursive function that takes a root node (Some node or None) and a value (e.g. 1 or "hello" or something). Notice we don't have to specify any types. OCaml is clever enough to figure all of that out for us based on our usage. Shweet.

This line `let result = match root with` says, create a value (like a variable that can't change once set) named "result". Set its value equal to the result of our match statement. You can think of a match statement like a switch statement, except a switch statement is Danny DeVito and a match statement is Arnold Schwarzenegger.

What follows is a bunch of statements that look like this: `| bleh -> blah`. Bleh is the pattern being matched, and blah is what we return if that pattern is matched.

So,

`| None -> {value=v; left=None; right=None; balance=0}` says, if root is None, return a new avl_node.

`| Some n when v > n.value -> { n with right = insert_node n.right v }` says, if root is not None, we'll call it n, and if the value we're inserting is bigger than n's value, we'll insert our value to the right of n.

Let's break that insert right down a bit. This code `{ n with right = insert_node n.right v }` says, return n, except with the `right` property set to the result of calling `insert_node` with n.right as the first argument and v as the second.

Finally, `in Some result`, the in here is scoping the previously declared `result` value to the statement `Some result` which is our return value.

*whew*

OK. So, having somewhat explained the OCaml syntax, hopefully you'll see that what `insert_node` is doing is this:

- insert_node root v
- if root's value is the same as v, we'll just return root
- if v is greater than root's value, we need to insert v to the right of root
- if v is less than root's value, we need to insert v to the left of root

Let's use utop to see if it all works:

```bash
utop
#use "avl.ml";;
let r = insert_node None "Hello";;
insert_node r "World";;
```

Very nice.

Note: in utop, each statement has to end with `;;`.

## Finding a node

Now, we'll define a function `find_node`.

```ocaml
let rec find_node v root =
  match root with
    | Some n when v > n.value -> find_node v n.right
    | Some n when v < n.value -> find_node v n.left
    | _ -> root
```

Here, what we're saying is, if our value is less than the node's value, go left, if it's greater, go right, otherwise, we've either found our value or we've reached the state where root is None. Either way, we can return root in this case (None or the matched node).

Simple. Pretty elegant, too.

Let's test it in utop

```bash
utop
#use "avl.ml";;
let r = insert_node None "Hello";;
let r = insert_node r "World";;
find_node r "World";;
find_node r "Universe";;
```

Note: in utop, it's legal to re-bind a value, but this is not legal in normal OCaml.

## Removing a node

The last thing we need to do is remove a node from the tree.

```
let rec remove_node v root =
  match root with
    | None                      -> root
    | Some n when v > n.value   -> Some { n with right = remove_node v n.right }
    | Some n when v < n.value   -> Some { n with left = remove_node v n.left }
    | Some ({left = Some l; right = Some r} as n) ->
        Some { n with value = r.value; right = remove_node r.value n.right; }
    | Some {right = Some r}     -> Some r
    | Some {left}               -> left
```

That's pretty complicated. Let's test it out in utop.

```bash
utop
#use "avl.ml";;
let r = insert_node None "Hello";;
let r = insert_node r "World";;
remove_node r "World";;
remove_node r "Universe";;
```

Let's break the algorithm down:

- Go left if value < current node's value
- Go right if value > current node's value
- If current node is the one we want to remove...
  - If current node has both a right and a left,
    - Current node adopts its right value (thereby removing current node's value from the tree)
    - Continue the removal on the right path
  - If current node has no left value, replace current node with its right value
  - Replace current node with its left value

That's the basic algorithm. The code reflects it pretty clearly, I think.

If you're having trouble following the algorithm, try drawing a few trees and visually running through the removal process.

## Cleaning up

Note that insert, find, and remove all have to crawl the tree in order to perform their logic. It should be possible to abstract the concept of "crawl" and reuse it in all three functions. Though, each abstraction I tried only made the code less clear. If you come up with a better way to write any of this, please share it with me!

## Conclusion

That's it for a basic binary search tree in Bucklescript.

Up next:

[Part 2: Unit testing with mocha]({{ site.baseurl }}{% post_url 2016-09-03-avl-tree-in-bucklescript-part-2 %})
