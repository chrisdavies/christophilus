# Why write zero-dependency software?

Over the past few weeks, I've been tinkering with building a project from scratch in Bun. Here's why I'm doing this.

There are [many](https://news.ycombinator.com/item?id=40791829) [examples](https://news.ycombinator.com/item?id=29863672) [of](https://news.ycombinator.com/item?id=38969533) [supply](https://news.ycombinator.com/item?id=39865810) [chain](https://news.ycombinator.com/item?id=30703817) [vulnerabilities](https://news.ycombinator.com/item?id=25413053). In particular, the JavaScript / TypeScript world has a reputation for pulling in dependencies for even the most basic needs. I once had a job working on a popular open source project whose `package.json` was over 1,700 lines long. It installed over 13,000 dependencies. It's impossible to reason about the security of such an application.

Building things yourself won't necessarily protect you from security vulnerabilities. In fact, you may be *more likely* to introduce vulnerabilities by building something from scratch. It's common knowledge, for example, that you shouldn't build your own encryption library, as you're likely to get things wrong, and a hacker will happily take advantage of that. That said, in general, if you minimize your dependencies, you shrink your attack surface.

When done right, building things yourself improves long-term maintainability. You're more likely to be able to fix bugs in small, simple, focused code you write than when you're dealing with large, general, and abstract third-party libraries. This isn't always true-- as anyone who has inherited someone else's spaghetti can attest. You can make a real mess of things when you build things yourself, and your home-grown solutions will likely be poorly documented compared to a popular npm package that solves a similar problem. Discernment is required.

There's another reason to build things from scratch: it's a fun way to learn.

> This isn't a zero-dependency project! It requires Bun which itself pulls in a whole nest of dependencies (Zig, SQLite, JavaScriptCore, etc). It runs on a Linux distro which is a massive web of dependencies. It requires electricity from the nearby nuclear power plant which in turn requires uranium mines. This requires a somewhat advanced civilization with the ability to coordinate and secure supply chains. No project is an island unto itself.
>
> — Hacker News Pedants, probably

As an educational device, I'm taking an extreme, impractical, and ill-advised hard-line approach on this side project. I'm not suggesting that anyone wages a total anti-dependency war at their day job. (I mean, if you want to lose your job, it's a creative way to quit. So there's that.) What I *am* suggesting is that the industry generally-- and JavaScript developers in particular-- could use a nudge towards reducing dependencies.

