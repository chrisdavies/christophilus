# AVL tree in Bucklescript (part 4)

We've [built a binary search tree in OCaml]({{ site.baseurl }}{% post_url 2016-09-03-avl-tree-in-bucklescript-part-1 %}), and we've [tested it](({{ site.baseurl }}{% post_url 2016-09-03-avl-tree-in-bucklescript-part-2 %})), *and* we've [kept track of node balances]({{ site.baseurl }}{% post_url 2016-09-05-avl-tree-in-bucklescript-part-3 %}). It's time to put it all together.

## Rotating things

How do we know when our tree is out of balance?

If a node is -2 or +2, we gotsta balance the tree. If -2, the tree is left-heavy and needs to be rotated right around the out-of-balance node. If +2, the tree is right-heavy and needs to be rotated left.

## Single rotations

In a single rotation, there are two nodes whose balances will be affected. Nodes B and D from this diagram:

```
    D (-2)
   /
  B (-1)
 /
A (0)
```

This tree needs a single-right rotation:

```
    D        B
   /        / \
  B    ->  A   D
 /
A
```

The rules for a single-right rotation are as follows:

```
D.left = B.right
B.right = D
```

Or more generally

```
rotate_right(node)
  left = node.left
  node.left = left.right
  left.right = node
```

Now, let's think about how such a rotation affects the balance of nodes B, and D.

D's balance is -2, and B's balance is -1, which means that D.right_depth = B.right_depth. Since B's right beomes D's left, D's balance will become 0.

B's balance is -1 which means that when the rotation completes, D will have the same depth as A which in turn makes B have a balance of 0.

Before we generalize, there is another scenario that leads to a single-right rotation:

```
    D
   /
  B
 / \
A   C
```

We could get this shape of tree if we deleted a node E, for instance. Let's see what happens when we rotate this one.


```
    D         B
   /         / \
  B    ->   A   D
 / \           /
A   C         C
```

Here, B starts off as 0. This means that D.right_depth < B.right_depth. Since B's right becomes D's left, D's balance will become -1.

B's balance is 0 which means that when the rotation completes, D will have children one-level deeper than A which in turn makes B have a balance of 1.

There is a third scenario, where B has a balance of 1, but in that case, we need a totally different kind of rotation, so we'll come back to that scenario. For now, let's summarize the rotate-right balance rules:

```
if left.balance = -1
  node.balance <- left.balance <- 0
else if left.balance = 0
  node.balance <- -1
  left.balance <- 1
```

The rotate left rules are the inverse:

```
A
 \
  B          B
   \        / \
    D  ->  A   D
```


```
A           C
 \         / \
  C    -> A   D
 / \       \
B   D       B
```

So we can generalize rotate-left balance rules:

```
if right.balance = 1
  node.balance <- right.balance <- 0
else if right.balance = 0
  node.balance <- 1
  right.balance <- -1
```

## Double rotations

In a double rotation, there are three nodes whose balances will be affected. We'll call these nodes A, B, and C from this diagram:

```
  C (-1)
 /
A (1)
 \
  B (0)
```

This tree needs a double-right rotation.

```
  C         C        B
 /         /        / \
A    ->   B   ->   A   C
 \       /
  B     A
```

The rules for a double-right rotation are as follows:

```
A.right = B.left
C.left = B.right
B.left = A
B.right = C
```

Now, let's think about how such a rotation affects the balance of nodes A, B, and C.

First, note that A's balance is 1. This means that A.left_depth = max(B.left_depth, B.right_depth). So, if B's balance <= 0, a's balance will become 0. This is because A is inheriting B's maximally deep child.

Next, node that C's balance is -2. This means that C.right_depth = max(B.left_depth, B.right_depth). So, if B's balance >= 0, C's balance will become 0.  This is because C is inheriting B's maximally deep child.

Lastly, note that B always gets balanced out to zero in the event of a double-rotation.

Let's jot this down:

```
A.balance <- 0 if B.balance >= 0
C.balance <- 0 if B.balance <= 0
B.balance <- 0
```

The opposite is holds for double-left rotations:

```
A.balance <- 0 if B.balance >= 0
C.balance <- 0 if B.balance <= 0
B.balance <- 0
```

## AVL in OCaml

NOW, we're finally ready to balance our stinkin' tree for realz.

Let's add a few functions to handle our rotations.

```ocaml
let rotate_left n r =
  let left = {n with right = r.left; balance = if r.balance = 1 then 0 else 1}
  in { r with left = Some left; balance = if r.balance = 1 then 0 else (-1); }

let rotate_right n l =
  let right = {n with left = l.right; balance = if l.balance = (-1) then 0 else (-1)}
  in {l with right = Some right; balance = if l.balance = (-1) then 0 else 1}

let double_rotate a b c =
  let new_a = { a with right = b.left; balance = if b.balance >= 0 then 0 else a.balance }
  in let new_c = { c with left = b.right; balance = if b.balance <= 0 then 0 else c.balance }
  in { b with left = Some new_a; right = Some new_c; balance = 0 }

let rotate n =
  let result = match n with
  | {balance=2;right=Some ({balance= -1; left=Some b} as c)} -> double_rotate n b c
  | {balance= -2;left=Some ({balance= 1; right=Some b} as a)} -> double_rotate a b n
  | {balance=2;right=Some r} -> rotate_left n r
  | {balance= -2;left=Some l} -> rotate_right n l
  | _ -> n
  in Some result
```

Now, we need to call rotate any time we insert or remove.

```ocaml
let rec insert_node v root =
  let result = match root with
  | None                    -> {value=v; left=None; right=None; balance=0}
  | Some n when v > n.value -> inserted_right (insert_node v n.right) n
  | Some n when v < n.value -> inserted_left (insert_node v n.left) n
  | Some n                  -> n
  in rotate result


let rec remove_node v root =
  let result = match root with
  | None                      -> root
  | Some n when v > n.value   -> Some (removed_right (remove_node v n.right) n)
  | Some n when v < n.value   -> Some (removed_left (remove_node v n.left) n)
  | Some ({left = Some l; right = Some r} as n) ->
      Some (removed_right (remove_node r.value n.right) {n with value = r.value})
  | Some {right = Some r}     -> Some r
  | Some {left}               -> left
  in result |> bind rotate
```

All we've done is catch the result of insert/remove into a `result` variable and then return the rotation of that result. You may notice that remove node doesn't directly call rotate. Instead, it has this weird pipe: `|> bind rotate`.

Bind is defined thus:

```ocaml
let bind f v =
  match v with
  | Some v -> f(v)
  | None   -> None
```

This is the last new concept we'll be covering. This is known as a monadic bind. It sounds fancy, but it's really very simple.

The `insert_node` function is guaranteed to return a value, but `remove_node` function may not. What if the node we're trying to remove isn't in the tree? The result in `remove_node` would be `None`. Problem is, rotate expects a node. What to do? What to do?

We use bind. If it is passed a None, it doesn't call its f argument. If it is passed Some x, it calls f with x. Piece of cake.

## Conclusion

And with that, ladies and gentlemen, we have an AVL tree written in Bucklescript. It's probably not a very efficient AVL implementation, as it's using immutable structures and doing lots of writes/updates on every insert/delete. But it works and it's purty nifties.

## Postscript... Bucklescript impressions

This being my first ever Bucklescript project, I thought I'd note some impressions here.

Bucklescript is fast. Really fast. It's the fastest compile-to-js language I've used. I haven't benchmarked it, but it feels faster than Babel. Considering that it is statically typed with full type inference, this is quite an acomplishment.

Good.

Thanks to stellar type inference, you get maintainability without having to litter your code with type annotations.

Good.

Interacting with existing JavaScript libraries is relatively painless, but does require that you put in the effort of defining all of the types/functions that you might use from the external library. This is tedious, to say the least. But it is not difficult.

Meh.

Compiler errors can be pretty obtuse, if you're not used to them. The current compiler gives you errors that look like this:

```
File "src/avl.ml", line 21, characters 27-29:
Error: Syntax error
```

Not super helpful. Something like this would be better:

```
File "src/avl.ml", line 21, characters 27-29:

| Some n -> if (n.left: None && n.right = None) || n.balance <> 0 then 1 else 0
                      ^
Error: Syntax error
```

Which would be pretty easy to get, considering the compiler knows the file, line, and column where the error occurs. It would be nice to have a suggested fix, e.g. "Did you mean n.left="?

All in all, my impression of Bucklescript is positive so far.