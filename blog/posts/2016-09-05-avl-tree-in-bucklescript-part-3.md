# AVL tree in Bucklescript (part 3)

We've [built a binary search tree in OCaml]({{ site.baseurl }}{% post_url 2016-09-03-avl-tree-in-bucklescript-part-1 %}), and we've [tested it](({{ site.baseurl }}{% post_url 2016-09-03-avl-tree-in-bucklescript-part-2 %})). Now, it's time to AVL it.

## Balancing act

The first thing we need to do is keep track of a node's balance factor whenever we insert/remove. Balance factor is just a number for tracking whether our tree is right heavy (positive number), left heavy (negative number) or balanced (zero). Here's a tree with each node's balance information noted in parenthesis:

```
             50 (-1)
          /        \
        40 (-2)   80 (0)
      /          /       \
    30 (1)      70 (0)  90 (0)
      \
       35 (0)

```

In this tree, node 40 is out of balance. It has a left branch that is 2 levels deep and no right branch. If a node's has a balance where `absolute_value(balance) > 1`, the node is out of balance and needs to be adjusted. We'll worry about making the adjustments later. Right now, we need to update our code to properly keep track of balances.

## Inserting nodes

We can distill the ways in which insertions affect balance:

- If I insert left and have no left child, or my left child's balance becomes non-zero
  - My balance = balance - 1
- If I insert right and and have no right child, or my right child's balance becomes non-zero
  - My balance = balance + 1

Let's adjust our insertion function to take this into account.

First, we'll add a function that computes whether a parent node's balance has changed, given the state of a child node. This function returns a 0 or a 1 so that we can add/subtract this number from the parent's balance.

```ocaml
(** computes whether or not the inserted child node should cause the
parent node to change its balance *)
let balance_change new_child =
  match new_child with
  | Some n -> if (n.left = None && n.right = None) || n.balance <> 0 then 1 else 0
  | _ -> 0
```

Next, let's right some functions that adjust a node in response to inserting right or left.

```ocaml
let inserted_right child n =
  { n with right=child; balance=n.balance + (balance_change child)}

let inserted_left child n =
  { n with left=child; balance=n.balance - (balance_change child)}
```

Finally, let's call all of these from our `insert_node` function:

```ocaml
let rec insert_node v root =
  let result = match root with
    | None                    -> {value=v; left=None; right=None; balance=0}
    | Some n when v > n.value -> inserted_right (insert_node v n.right) n
    | Some n when v < n.value -> inserted_left (insert_node v n.left) n
    | Some n                  -> n
  in Some result
```

And let's add some unit tests to see if it all works.

Let's modify our `assert_value` to take balance factor as an argument and assert that it meets our expectations:

```ocaml
(* A convenience function asserting a node has a specific value and balance factor *)
let assert_value s b node =
  match node with
  | Some ({value;balance} as n) -> assert_equal s value; assert_equal b balance; n
  | _ -> raise (Fail ("Expected " ^ s ^ " bug got None"))
```

And we've got to modify our invocations accordingly. I won't dump all of my tests here, but here's an example:

```ocaml
  it "should insert right" (fun () ->
    make_tree ["hi";"there"]
    |> assert_value "hi" 1
    |> get_right |> assert_value "there" 0
    |> ignore
  );
```

Running `npm test` should show all of our insertion tests pass, but our deletion tests are now failing. Let's fix that.

## Removing nodes

The rules for adjusting balance factor on remove are very simple. If you remove from your right, decrement your balance. If you remove from your left, increment your balance.

Let's add in some functions to adjust a node's balance after removal of it's child:

```ocaml
let removed_right child n =
  { n with right=child; balance=n.balance - 1}

let removed_left child n =
  { n with left=child; balance=n.balance + 1}
```

And let's call those from our `remove_node` function:

```ocaml

let rec remove_node v root =
  match root with
    | None                      -> root
    | Some n when v > n.value   -> Some (removed_right (remove_node v n.right) n)
    | Some n when v < n.value   -> Some (removed_left (remove_node v n.left) n)
    | Some ({left = Some l; right = Some r} as n) ->
        Some (removed_right (remove_node r.value n.right) {n with value = r.value})
    | Some {right = Some r}     -> Some r
    | Some {left}               -> left
```

Now, if we run `npm test`, we should see beautiful green colors everywhere. Huzzah! Get yourself a beer.

Then add some more tests, you slacker.

## Conclusions

Well, we haven't actually balanced our tree, but we're one step closer to achieving that. We now know the balance factor of all nodes in our tree, and armed with that knowledge, we're ready to finish our AVL tree.

[Next: the final AVL tree]({{ site.baseurl }}{% post_url 2016-09-09-avl-tree-in-bucklescript-part-4 %})
