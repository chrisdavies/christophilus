# AVL tree in Bucklescript (part 2)

## AKA Unit testing with Mocha

Now that we've [written our binary search tree](({{ site.baseurl }}{% post_url 2016-09-03-avl-tree-in-bucklescript-part-1 %})), it's time to test it. We're going to use [mocha](https://mochajs.org/) because its hella fast. Also, Bucklescript's documentation sort of suggests it might be a first-class Bucklescript citizen at some point.

## FFI

Mocha is a JavaScript unit testing framework. Since it's not ML, we've got to do some tricks in order for Bucklescript to understand it. We've got to use foreign function interfaces (FFI). Sounds complicated. It's really not.

First, install mocha:

```
npm install --save-dev mocha
```

Next, create a `bs-test` folder.

Now, let's do some FFI. Create a file `bs-test/mocha.ml`. In here, we're going to define a bunch of functions that tell OCaml about the mocha library.

```ocaml
external describe : string -> (unit -> unit) -> unit = "" [@@bs.val]

external it : string -> (unit -> unit) -> unit = "" [@@bs.val]

external eq : 'a -> 'a -> unit = "deepEqual"
    [@@bs.module "assert"]

let assert_equal = eq
let assert_notequal = neq

exception Fail of string
```

I ripped most of these straight out of the [Bucklescript addons](https://github.com/bloomberg/bucklescript-addons/tree/master/bindings/bs-mocha) repo, which seemed a bit stale and gave me some issues.

So, what's going on with this code? Let's look at a few lines. First:

`external describe : string -> (unit -> unit) -> unit = "" [@@bs.val]`

- external - tells OCaml this function is defined in an outside (Js) package
- describe - the name of the external function
- `: string -> (unit -> unit) -> unit`
  - This is a type definition it says that the define function
  - Takes a string as its first argument*
  - Takes a function as its second argument*
    - This function takes no arguments has no return value
  - The define function returns no value
- `= ""` - tells OCaml that the external name is the same as the name we just defined (describe)
- `[@@bs.val]` - binds to a JavaScript value... don't ask. Just do it.

Note: All OCaml functions are auto-curried and take only one argument, but you don't need to worry about that right now.

## Writing our first test

Now, we're ready to start consuming some mocha functions. Create `bs-test/avl_test.ml` and make it look like this:

```ocaml
open Avl
open Mocha

let assert_value s node =
  match node with
  | Some ({value} as n) -> assert_equal s value; n
  | _ -> raise (Fail ("Expected " ^ s ^ " bug got None"))

let () =
  describe "Insert" (fun () ->
    it "should create a node" (fun () ->
      insert_node "hi" None
      |> assert_value "hi"
      |> ignore
    );
  )
```

What's with all these weird symbols, you ask? Patience, young Skywalker.

The open statements bring the functions from outside modules into our file. Here, we're importing our Avl functions (defined in part 1) and our Mocha functions (defined above).

Next, we define a little helper function `assert_value`. There are a handful of new concepts in it.

First, there's a semicolon `assert_equal s value; n`. That allows our match to run two statements, rather than the usual one. It's going to run an `assert_equal` and then it's going to return `n`.

Second, there's the raise statement. This is how you throw exceptions in OCaml.

Lastly, there's the `^` string concatenation operator.

## Partial application

Remember how I noted that OCaml functions all take a single argument? Well, that's what allows us to write `assert_value "hi"` in the unit test above.

You may remember that we defined `assert_value` like so: `let assert_value s node =`. It takes two arguments. So what's happening when we call it with only one argument?

It returns a function. If this were JavaScript (ES5), `assert_value` might look like this:

```js
function assert_value(s) {
  return function (node) {
    assert_equal(node.value, s)
  }
}
```

So you can see that we could then call this JavaScript function like so `assert_value("hi")` and it will return us a brand spanking new function.

OCaml does this for us automatically. It's a powerful combination of [currying](https://en.wikipedia.org/wiki/Currying) and [partial application](https://en.wikipedia.org/wiki/Partial_application).

One last thing to note is that all of our AVL functions take their arguments in this order: `insert_node v root`. Value first, then the node that is being operated on. This is handy because it allows us to define useful partially-applied versions of our AVL functions. When thinking about the order of your function arguments, spend a wee bit of time thinking about how they might be partially applied and order accordingly.

## The pipe operator

Now we're ready to talk about the funny `|>` operator in our test code. This looks odd to most non-ML programmers. It's called the pipe operator. And it is superfly.

```ocaml
  insert_node "hi" None
  |> assert_value "hi"
  |> ignore
```

What this is doing is saying, call `insert_node "hi" None` and pass its return value into `assert_value "hi"` and pass *that* function's return value into the `ignore` function which returns a unit (which is what our Mocha functions expect).

It's the same as writing this:

```ocaml
ignore (assert_value "hi" (insert_node "hi" None))
```

Ew gross. Don't do that. Use `|>`, mkay?

## How about running our tests?

"OK, OK, nifty", you say, "but what good are tests if we don't run them?"

Take it easy there, chum. We're getting to that.

Modify your `package.json` to have this definition for test:

```
"test": "bsc -bs-package-name $npm_package_name -bs-package-output test -I src -I bs-test -c -bs-files src/*.ml bs-test/*.ml && mocha",
```

That's a mouthful. It's compiling our `src` and `bs-test` directories and dumping the result into a folder called `test`. Then it runs mocha which expects lovely JavaScript tests to exist in the `test` folder. So make sure you've created all of those folders.

Save the file, and head over to your terminal. You should be able to run:

```
npm test
```

And you should see some nice green tests passing.

## Test all the things

Well, most of the things... Here's my amazing test suite for our binary search tree. I'll leave you to work through it, if you like.

```ocaml
open Avl
open Mocha

(* A convenience function for building a tree from a list of values *)
let make_tree vals =
  let rec make_tree_rec node vals =
    match vals with
    | []       -> node
    | hd :: tl -> make_tree_rec (insert_node hd node) tl
  in make_tree_rec None vals

(* A convenience function asserting a node has a specific value *)
let assert_value s node =
  match node with
  | Some ({value} as n) -> assert_equal s value; n
  | _ -> raise (Fail ("Expected " ^ s ^ " bug got None"))

(* A convenience function for asserting that we expect None *)
let assert_empty = assert_equal None

let get_right node = node.right
let get_left node = node.left

let () =
  describe "Insert" (fun () ->
    it "should create a node" (fun () ->
      make_tree ["hi"]
      |> assert_value "hi"
      |> ignore
    );
    it "should insert right" (fun () ->
      make_tree ["hi";"there"]
      |> assert_value "hi"
      |> get_right |> assert_value "there"
      |> ignore
    );
    it "should insert left" (fun () ->
      make_tree ["there";"hi"]
      |> assert_value "there"
      |> get_left |> assert_value "hi"
      |> ignore
    );
    it "can go deep" (fun () ->
      make_tree ["a";"c";"b"]
      |> assert_value "a"
      |> get_right |> assert_value "c"
      |> get_left |> assert_value "b"
      |> ignore
    );
  );
  describe "Delete" (fun () ->
    it "removes nodes" (fun () ->
      make_tree ["a";"c";"b"]
      |> remove_node "c"
      |> assert_value "a"
      |> get_right |> assert_value "b"
      |> ignore
    );
    it "removes root" (fun () ->
      make_tree ["b";"a";"c"]
      |> remove_node "b"
      |> assert_value "c"
      |> get_left |> assert_value "a"
      |> ignore
    );
    it "removes all" (fun () ->
      make_tree ["b";"a"]
      |> remove_node "b" |> remove_node "a"
      |> assert_empty
    );
  );
  describe "Find" (fun () ->
    it "finds nodes" (fun () ->
      make_tree ["a";"c";"b"]
      |> find_node "c"
      |> assert_value "c"
      |> ignore
    );
    it "is none if no match" (fun () ->
      make_tree ["a";"c";"b"]
      |> find_node "z"
      |> assert_empty
    )
  );
```

## Conclusion

Testing with Bucklescript and Mocha is pretty easy, once you get a handle on FFI.

While writing this up, I did find myself baffled by vague and unhelpful compiler errors. A good chunk of these errors was a result of me having build artifacts from an `avl.ml` file I had in my root directory. Stupid me.

Anyway, hopefully the Bucklescript/OCaml folks will get all Elm on us and give us friendlier compiler errors in the future.

[Up next... An actual AVL tree!]({{ site.baseurl }}{% post_url 2016-09-05-avl-tree-in-bucklescript-part-3 %})