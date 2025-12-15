# Another Look at F#

Yesterday, I spent a few hours rewriting a little JavaScript command line utility into F#. I used VSCode with the excellent Ionide plugins.

Here are some takeaways in no particular order.

## The good

F# is terse but readable. The program ended up being a little more than ½ the size of the JavaScript version. I never had to specify a type, yet I still got excellent intellisense, and accurate errors displayed to me in the editor. In fact, whenever I ridded my code of the little red underlines, it always compiled, and it always worked.

People in other statically typed languages— including ML derivatives— often think your code is clearer and more maintainable if you at least annotate your function definitions. F# seems to disregard that notion, and does it successfully. I think it gets away with this partly because it is a language that is almost always used with an IDE or a good IDE-like plugin (Ionide). So, if you really can’t understand how to call a function, you can hover your mouse over the function and see its inferred argument and return types. Also, my experience so far is that F# somehow really encourages teeny tiny functions. My biggest function was the “printHelp” function which was 5 lines of code and thoroughly understandable at a glance. Tiny functions are generally understandable (unless they’re tiny due to weird APL-like syntax), and understandable functions don’t need to be littered with type information to improve understandability.

That said, I do think that if I were to author an F# library or something like that, I’d annotate make my public functions. It just seems like the right thing.

## The not so good

There were a handful of hiccups on the way.

Non-Windows setup

I’m using a Mac (alas, it’s pretty much required for my day job), so I’m a 2nd class citizen in the F# world. It took a while for me to get everything set up and working. The F# toolchain outside of Windows seems solid, but poorly documented. It wasn’t rocket science to get up and running, but it was definitely not as smooth as, say, something like Node. (I’ll publish a step-by-step in another post.)

Terms can be overwritten

Terms can be overwritten without any warning at all. Here’s an actual example of how this gave me a bit of a snag.

I had some code that looks like this:

```f#
open Fake

Target "Clean" (fun _ ->
    …
)
```

All was well in the world. Then, I needed to pull in a little compiler tool, so I added this line:

```F#
open Fake
open Fake.FscHelper

Target "Clean" (fun _ ->
    …
)
```

Crash and burn. It turns out that Fake defines Target but so does Fake.FscHelper. And the two definitions clash. But rather than get a useful warning or error like “Target is defined in Fake and in Fake.FscHelper. You need to disambiguate.” I just got a weird type error indicating that I was calling Target with the wrong kinds of parameters.

Code that had been working was suddenly not working and the reason wasn’t very obvious. I honestly don’t know why F# allows you to redefine a term like this.

Fixing it was a pain, too. As far as I can tell, there’s no way to exclude terms from being imported with an open statement. There’s no equivalent to the ES6 import syntax:

```f#
import {foo} from ‘bar’
```

I think this is a pretty glaring limitation. I wound up having to reorder my open statements and then fully qualified or aliased my calls to Fake.FscHelper.Target. Far from ideal.

## No function overloading

This is a big deal. I wanted to do something like this:

```f#
let exec [] = printfn “A term is required”
let exec [hd] = doSomething hd
let exec [hd::rest] = doSomethingElse hd rest
```

No can do. In this case, I was able to pretty easily work around the limitation by using pattern matching. That said, in a statically typed functional language, the ability to overload a function seems pretty important and pattern matching can’t always be the solution.

For instance, I would like to be able to call a toJson function and pass it any type, and have it call the appropriate, type-specific, function if available, and fall back to some generic one if no specific one has been written.

F# does have member functions (or maybe they’re really methods), which allows you to kind of work around this, but it feels like I’m dropping out of the functional world and back into OO. This makes me sad.

## No default arguments

Evidently, it’s rare for a statically typed functional language to allow default arguments. It makes currying harder to implement. But OCaml can do it, so F# should be able to, too.

Not a big deal, but I did have to work around it in one context. The workaround was pretty elegant, thanks to pattern matching, so maybe this gripe isn’t a big deal. Still, thought I’d jot it down.

## Conclusion

It’s too early to say, but I did really enjoy the experience of writing and reading F#. The tools on Mac are surprisingly good. The language is highly expressive, terse, and intelligible… A winning combination. If I continue down the F# road, it’ll be interesting to see how active the community is, how robust the ecosystem is, etc. But for now, I have to say tentatively that I’m a fan.