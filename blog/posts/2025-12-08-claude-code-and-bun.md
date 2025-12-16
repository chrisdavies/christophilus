# Claude and Bun

I thought of [this](https://github.com/chrisdavies/bunfx) project after the Nth npm-related vulnerability. How realistic is it to build a low-dependency application, using Claude to generate code that you would normally pull in from npm?

I also wanted to do a deeper assessment of building something realistic in Bun.

## Replacing npm with Claude Code

Most of the code in the project was written by Claude Code (Opus 4.5). I didn't review any of the tests or markdown files. I *did* however review the generated source code. For important files, my reviews were thorough(ish). For unimportant files (e.g. CSS), I just did a quick scan.

The results not excellent, but acceptable. Most of the time, its first solution was almost good enough. It went wrong in various ways. It tended to be overly verbose or inefficient in ways humans probably would have avoided. It sometimes solved problems by littering a module with effectful global mutatable state. It often generated code which was quite different in style from other code in the project (this may be due to me not properly shaping my claude.md or whatever).

That said, TypeScript and Biome helped guide things to a mostly consistent place faster than if I'd written all of this myself. The total effort I exerted to build this project was lower than if I'd built it myself.

## Is it more secure than npm?

Maybe, maybe not. I have no doubt an astute security researcher could find vulnerabilities in this codebase. There are certainly fewer eyes on this than on a popular npm package. On the other hand, the code that is committed here gets reviewed rather than blindly pulled and updated (as is the case with every npm-based project I've ever been a part of). And I don't need to worry about the never ending upgrade cycle and resulting instability.

## Benefits of DIY w/ Claude

With Claude, you can build a set of tools that fit you and your application. With npm, you end up cobbling together a bunch of disparate libraries, each with a distinct style and flavor, some of which are unpleasant.

With Claude, you build what you need. With npm, you are likely to pull in an overly general library that gives you the function you want along with 10 you don't.

## Is it faster than npm?

No. Maybe? This project took quite a bit longer to to build than if I had simply run `npm install a bunch of crap` and then tossed the app together. About half of my time on the project was iterating on architecture / API design, and half was code-review and providing feedback to Claude.

However, now that the foundation is built, maybe it will be faster moving forward. I may build another demo project on top of this, and see how that goes.

## What about Bun?

Let's move on to Bun.

So far, building on top of Bun has been excellent with on caveat.

Bun's SQL layer is incomplete:

- No logging support
- No transform support (e.g. no equivalent to Postgres.js `transform: toCamel`)
- No support for streaming large resultsets

The first two aren't showstoppers. They're annoying, and require a bit more care when querying data. But the lack of streaming does make certain classes of applications impossible to build effectively (anything which needs to read massive amounts of data from a database for any purpose).

## Conclusion

I quite enjoyed this. Claude Code with Opus 4.5 and Bun is a very nice combo. So nice, in fact, that Anthropic acquired Bun. If you've still not built anything with these two tools, I highly recommend giving it a try.

